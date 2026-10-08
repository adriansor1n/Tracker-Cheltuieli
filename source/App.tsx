import { useEffect, useMemo, useState } from "react";

type Category =
  | "Mâncare"
  | "Transport"
  | "Locuință"
  | "Shopping"
  | "Sănătate"
  | "Distracție"
  | "Educație"
  | "Altele";

type Theme = "light" | "dark";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  date: string;
  note: string;
}

const categories: Category[] = [
  "Mâncare",
  "Transport",
  "Locuință",
  "Shopping",
  "Sănătate",
  "Distracție",
  "Educație",
  "Altele",
];

const icons: Record<Category, string> = {
  Mâncare: "🍜",
  Transport: "🚗",
  Locuință: "🏠",
  Shopping: "🛍️",
  Sănătate: "💊",
  Distracție: "🎬",
  Educație: "📚",
  Altele: "✨",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function App() {
  /*
   * ============================================================
   * CHELTUIELI
   * ============================================================
   */

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("oasp​end-expenses");

    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  /*
   * ============================================================
   * BUGET INIȚIAL
   * ============================================================
   */

  const [startingMoney, setStartingMoney] = useState<number>(() => {
    const saved = localStorage.getItem(
      "oasp​end-starting-money"
    );

    if (!saved) {
      return 0;
    }

    const value = Number(saved);

    return Number.isFinite(value) && value >= 0
      ? value
      : 0;
  });

  /*
   * ============================================================
   * TEMĂ
   * ============================================================
   */

  const [theme, setTheme] = useState<Theme>(() => {
    return localStorage.getItem("oasp​end-theme") === "dark"
      ? "dark"
      : "light";
  });

  /*
   * ============================================================
   * FILTRE
   * ============================================================
   */

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("Toate");
  const [monthFilter, setMonthFilter] =
    useState("");

  /*
   * ============================================================
   * FORMULAR
   * ============================================================
   */

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] =
    useState<Category>("Mâncare");

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [note, setNote] = useState("");

  /*
   * ============================================================
   * API
   * ============================================================
   */

  const [euroRate, setEuroRate] =
    useState<number | null>(null);

  const [apiLoading, setApiLoading] =
    useState(true);

  /*
   * ============================================================
   * LOCAL STORAGE
   * ============================================================
   */

  useEffect(() => {
    localStorage.setItem(
      "oasp​end-expenses",
      JSON.stringify(expenses)
    );
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(
      "oasp​end-starting-money",
      String(startingMoney)
    );
  }, [startingMoney]);

  /*
   * ============================================================
   * DARK MODE
   * ============================================================
   */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    localStorage.setItem(
      "oasp​end-theme",
      theme
    );
  }, [theme]);

  /*
   * ============================================================
   * API EUR -> RON
   * ============================================================
   */

  useEffect(() => {
    fetch(
      "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RON"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("API error");
        }

        return response.json();
      })
      .then((data) => {
        const rate = Number(data?.rates?.RON);

        if (!Number.isFinite(rate)) {
          throw new Error("Curs indisponibil");
        }

        setEuroRate(rate);
      })
      .catch((error) => {
        console.error(
          "Eroare API:",
          error
        );

        setEuroRate(null);
      })
      .finally(() => {
        setApiLoading(false);
      });
  }, []);

  /*
   * ============================================================
   * FILTRARE
   * ============================================================
   */

  const filteredExpenses = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return [...expenses]
      .filter((expense) => {
        const matchesSearch =
          !query ||
          expense.title
            .toLowerCase()
            .includes(query) ||
          expense.note
            .toLowerCase()
            .includes(query);

        const matchesCategory =
          categoryFilter === "Toate" ||
          expense.category ===
            categoryFilter;

        const matchesMonth =
          !monthFilter ||
          expense.date.startsWith(
            monthFilter
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesMonth
        );
      })
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      );
  }, [
    expenses,
    search,
    categoryFilter,
    monthFilter,
  ]);

  /*
   * ============================================================
   * STATISTICI
   * ============================================================
   */

  const total = filteredExpenses.reduce(
    (sum, expense) =>
      sum + expense.amount,
    0
  );

  const average =
    filteredExpenses.length > 0
      ? total / filteredExpenses.length
      : 0;

  const highest = filteredExpenses.reduce(
    (max, expense) =>
      Math.max(max, expense.amount),
    0
  );

  const totalAllExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum + expense.amount,
      0
    );

  const remainingMoney =
    startingMoney - totalAllExpenses;

  /*
   * ============================================================
   * ADAUGARE CHELTUIALĂ
   * ============================================================
   */

  function addExpense(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const numericAmount = Number(
      amount.replace(",", ".")
    );

    if (
      !title.trim() ||
      numericAmount <= 0 ||
      Number.isNaN(numericAmount)
    ) {
      return;
    }

    const newExpense: Expense = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,

      title: title.trim(),
      amount: numericAmount,
      category,
      date,
      note: note.trim(),
    };

    setExpenses((current) => [
      newExpense,
      ...current,
    ]);

    setTitle("");
    setAmount("");
    setNote("");
  }

  /*
   * ============================================================
   * ȘTERGERE
   * ============================================================
   */

  function deleteExpense(id: string) {
    setExpenses((current) =>
      current.filter(
        (expense) =>
          expense.id !== id
      )
    );
  }

  /*
   * ============================================================
   * TEMĂ
   * ============================================================
   */

  function toggleTheme() {
    setTheme((current) =>
      current === "light"
        ? "dark"
        : "light"
    );
  }

  /*
   * ============================================================
   * EXPORT CSV
   * ============================================================
   */

  function exportCSV() {
    const header = [
      "Titlu",
      "Suma",
      "Categorie",
      "Data",
      "Nota",
    ];

    const rows = filteredExpenses.map(
      (expense) => [
        expense.title,
        expense.amount.toFixed(2),
        expense.category,
        expense.date,
        expense.note,
      ]
    );

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "oasp​end-cheltuieli.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*
   * ============================================================
   * GRAFIC CATEGORII
   * ============================================================
   */

  const categoryTotals = categories
    .map((item) => ({
      category: item,

      total: filteredExpenses
        .filter(
          (expense) =>
            expense.category === item
        )
        .reduce(
          (sum, expense) =>
            sum + expense.amount,
          0
        ),
    }))
    .filter(
      (item) => item.total > 0
    )
    .sort(
      (a, b) =>
        b.total - a.total
    );

  const categoryGrandTotal =
    categoryTotals.reduce(
      (sum, item) =>
        sum + item.total,
      0
    ) || 1;

  /*
   * ============================================================
   * GRAFIC LUNAR
   * ============================================================
   */

  const monthlyData = Array.from(
    { length: 6 },
    (_, index) => {
      const currentDate =
        new Date();

      currentDate.setMonth(
        currentDate.getMonth() -
          (5 - index)
      );

      const key = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}`;

      return {
        key,

        label:
          new Intl.DateTimeFormat(
            "ro-RO",
            {
              month: "short",
            }
          ).format(currentDate),

        total: expenses
          .filter((expense) =>
            expense.date.startsWith(
              key
            )
          )
          .reduce(
            (sum, expense) =>
              sum + expense.amount,
            0
          ),
      };
    }
  );

  const maxMonthly = Math.max(
    ...monthlyData.map(
      (item) => item.total
    ),
    1
  );

  /*
   * ============================================================
   * PAGINA
   * ============================================================
   */

  return (
    <div className="app">

      {/* HEADER */}

      <header className="topbar">

        <div className="brand">
          <img
            src="/oaspend-logo.png"
            alt="OaSpend"
            className="brand-logo-image"
          />

        <div>
         <strong>OaSpend</strong>

          <span>
            tracker de cheltuieli
          </span>
        </div>
        </div>

        <div className="header-actions">

          <div className="api-status">

            <span />

            {apiLoading
              ? "Se încarcă..."
              : euroRate
              ? `1 € = ${euroRate.toFixed(
                  2
                )} RON`
              : "API indisponibil"}

          </div>

          <button
            className="header-button"
            onClick={exportCSV}
            title="Export CSV"
            type="button"
          >
            ⇩
          </button>

          <button
            className="header-button"
            onClick={toggleTheme}
            title="Schimbă tema"
            type="button"
          >
            {theme === "dark"
              ? "☀"
              : "☾"}
          </button>

        </div>

      </header>

      <main className="container">

        {/* BUGET */}

        <section className="starting-money card">

          <div>

            <p className="overline">
              BUGETUL TĂU
            </p>

            <h2>
              Câți bani ai?
            </h2>

            <p>
              Introdu suma disponibilă
              de la început.
            </p>

          </div>

          <div className="starting-money-input">

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                startingMoney === 0
                  ? ""
                  : startingMoney
              }
              onChange={(event) => {
                const value =
                  Number(
                    event.target.value
                  );

                setStartingMoney(
                  Number.isFinite(
                    value
                  ) && value >= 0
                    ? value
                    : 0
                );
              }}
              placeholder="0.00"
            />

            <span>
              RON
            </span>

          </div>

        </section>

        {/* HERO */}

        <section className="hero">

          <div>

            <p className="overline">
              DASHBOARD PERSONAL
            </p>

            <h1>
              Controlează-ți banii,
              <br />

              <span>
                fără bătăi de cap.
              </span>
            </h1>

            <p className="hero-description">
              Vezi rapid unde se duc
              banii, adaugă cheltuieli
              și păstrează totul
              organizat într-un singur
              loc.
            </p>

          </div>

          <div className="total-circle">

            <small>
              TOTAL
            </small>

            <strong>
              {formatMoney(total)}
            </strong>

            <span>
              perioada selectată
            </span>

          </div>

        </section>

        {/* STATISTICI */}

        <section className="stats">

          <div className="stat-card green">

            <div>
              Total cheltuit
              <span>↗</span>
            </div>

            <strong>
              {formatMoney(total)}
            </strong>

            <small>
              {filteredExpenses.length}{" "}
              tranzacții
            </small>

          </div>

          <div className="stat-card purple">

            <div>
              Medie / tranzacție
              <span>≈</span>
            </div>

            <strong>
              {formatMoney(average)}
            </strong>

            <small>
              per cheltuială
            </small>

          </div>

          <div className="stat-card orange">

            <div>
              Cea mai mare
              <span>↑</span>
            </div>

            <strong>
              {formatMoney(highest)}
            </strong>

            <small>
              tranzacția maximă
            </small>

          </div>

          <div className="stat-card blue">

            <div>
              Curs EUR
              <span>€</span>
            </div>

            <strong>
              {euroRate
                ? `${euroRate.toFixed(
                    2
                  )} RON`
                : "—"}
            </strong>

            <small>
              via API
            </small>

          </div>

          <div className="stat-card green">

            <div>
              Bani rămași
              <span>✓</span>
            </div>

            <strong>
              {formatMoney(
                remainingMoney
              )}
            </strong>

            <small>
              din{" "}
              {formatMoney(
                startingMoney
              )}
            </small>

          </div>

        </section>

        {/* PARTEA PRINCIPALĂ */}

        <section className="main-grid">

          {/* FORMULAR */}

          <form
            className="card add-card"
            onSubmit={addExpense}
          >

            <div className="card-heading">

              <div>

                <p className="overline">
                  ADAUGĂ RAPID
                </p>

                <h2>
                  O cheltuială nouă
                </h2>

              </div>

              <span className="sparkle">
                ✦
              </span>

            </div>

            <label>
              Descriere

              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="ex. Prânz, benzină..."
              />
            </label>

            <div className="form-row">

              <label>
                Sumă

                <div className="money-input">

                  <input
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    inputMode="decimal"
                  />

                  <span>
                    RON
                  </span>

                </div>

              </label>

              <label>
                Data

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(
                      event.target.value
                    )
                  }
                />
              </label>

            </div>

            <label>
              Categorie

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target
                      .value as Category
                  )
                }
              >

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {icons[item]}{" "}
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>

            <label>
              Notiță{" "}
              <span>
                (opțional)
              </span>

              <textarea
                rows={3}
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value
                  )
                }
                placeholder="Un mic detaliu..."
              />
            </label>

            <button
              className="add-button"
              type="submit"
            >
              <b>+</b>
              Salvează cheltuiala
            </button>

          </form>

          {/* LISTA */}

          <div className="expenses-area">

            <div className="filters">

              <div className="search">

                <span>
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Caută o cheltuială..."
                />

              </div>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >

                <option value="Toate">
                  Toate categoriile
                </option>

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

              <input
                type="month"
                value={monthFilter}
                onChange={(event) =>
                  setMonthFilter(
                    event.target.value
                  )
                }
              />

            </div>

            <div className="card expense-card">

              <div className="list-header">

                <div>

                  <p className="overline">
                    ISTORIC
                  </p>

                  <h2>
                    Cheltuieli recente
                  </h2>

                </div>

                <span className="counter">
                  {
                    filteredExpenses.length
                  }
                </span>

              </div>

              {filteredExpenses.length ===
              0 ? (

                <div className="empty">

                  <div>
                    ☁
                  </div>

                  <h3>
                    Nicio cheltuială
                    găsită
                  </h3>

                  <p>
                    Schimbă filtrele sau
                    adaugă o cheltuială.
                  </p>

                </div>

              ) : (

                <div className="expense-list">

                  {filteredExpenses.map(
                    (expense) => (

                      <div
                        className="expense"
                        key={expense.id}
                      >

                        <div className="expense-icon">
                          {
                            icons[
                              expense.category
                            ]
                          }
                        </div>

                        <div className="expense-info">

                          <strong>
                            {
                              expense.title
                            }
                          </strong>

                          <span>
                            {
                              expense.category
                            }{" "}
                            ·{" "}
                            {formatDate(
                              expense.date
                            )}
                          </span>

                          {expense.note && (
                            <small>
                              {
                                expense.note
                              }
                            </small>
                          )}

                        </div>

                        <strong className="expense-price">
                          −
                          {formatMoney(
                            expense.amount
                          )}
                        </strong>

                        <button
                          className="delete"
                          onClick={() =>
                            deleteExpense(
                              expense.id
                            )
                          }
                          title="Șterge"
                          type="button"
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </section>

        {/* GRAFICE */}

        <section className="charts">

          <div className="card chart-card">

            <div className="list-header">

              <div>

                <p className="overline">
                  DISTRIBUȚIE
                </p>

                <h2>
                  Unde se duc banii?
                </h2>

              </div>

              <span className="chart-label">
                categorii
              </span>

            </div>

            <div className="bars">

              {categoryTotals.length ===
              0 ? (

                <p className="chart-empty">
                  Nu există date.
                </p>

              ) : (

                categoryTotals.map(
                  (item) => {

                    const percentage =
                      (item.total /
                        categoryGrandTotal) *
                      100;

                    return (

                      <div
                        className="bar-item"
                        key={
                          item.category
                        }
                      >

                        <div className="bar-top">

                          <span>
                            {
                              icons[
                                item.category
                              ]
                            }{" "}
                            {
                              item.category
                            }
                          </span>

                          <strong>
                            {formatMoney(
                              item.total
                            )}
                          </strong>

                        </div>

                        <div className="bar">

                          <div
                            style={{
                              width: `${Math.max(
                                percentage,
                                5
                              )}%`,
                            }}
                          />

                        </div>

                        <small>
                          {percentage.toFixed(
                            0
                          )}
                          %
                        </small>

                      </div>

                    );
                  }
                )

              )}

            </div>

          </div>

          <div className="card chart-card">

            <div className="list-header">

              <div>

                <p className="overline">
                  TENDINȚĂ
                </p>

                <h2>
                  Ultimele 6 luni
                </h2>

              </div>

            </div>

            <div className="monthly-chart">

              {monthlyData.map(
                (month) => (

                  <div
                    className="month"
                    key={month.key}
                  >

                    <small>
                      {month.total
                        ? formatMoney(
                            month.total
                          )
                        : "—"}
                    </small>

                    <div className="month-bar">

                      <div
                        style={{
                          height: `${
                            month.total
                              ? Math.max(
                                  (month.total /
                                    maxMonthly) *
                                    100,
                                  8
                                )
                              : 2
                          }%`,
                        }}
                      />

                    </div>

                    <span>
                      {month.label}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

        </section>

        <footer>

          <span>
            OaSpend · datele sunt
            salvate local în browser
          </span>

          <span>
            React + TypeScript ·
            LocalStorage
          </span>

        </footer>

      </main>

    </div>
  );
}

export default App;