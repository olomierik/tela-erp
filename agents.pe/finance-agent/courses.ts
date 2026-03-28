import { CourseDefinition } from "./types";

export const COURSES: CourseDefinition[] = [
  {
    title: "Introduction to AI in Accounting",
    description:
      "Master the fundamentals of artificial intelligence applied to modern accounting practice. " +
      "Covers AI-powered bookkeeping tools, automated journal entries, reconciliation bots, and how " +
      "machine learning is transforming the accounting profession. No prior AI experience required.",
    price: "0",
    category: "finance",
    syllabus: [
      {
        week: 1,
        topic: "The AI Revolution in Accounting",
        description: "Overview of how AI is reshaping accounting roles and workflows",
        learningObjectives: [
          "Understand the history of automation in accounting",
          "Identify current AI tools used by accounting firms",
          "Distinguish between rule-based automation and machine learning",
        ],
      },
      {
        week: 2,
        topic: "AI-Powered Bookkeeping Tools",
        description: "Hands-on exploration of tools like QuickBooks AI, Xero, and Botkeeper",
        learningObjectives: [
          "Configure automated transaction categorization",
          "Evaluate accuracy of AI bookkeeping outputs",
          "Understand bank feed reconciliation automation",
        ],
      },
      {
        week: 3,
        topic: "Automated Journal Entries & General Ledger",
        description: "How AI systems automate routine journal entries and maintain ledger integrity",
        learningObjectives: [
          "Design rules for automated journal entry posting",
          "Implement exception-flagging for anomalous entries",
          "Understand audit trails for AI-generated entries",
        ],
      },
      {
        week: 4,
        topic: "Natural Language Processing for Financial Documents",
        description: "Using NLP to extract data from invoices, receipts, and contracts",
        learningObjectives: [
          "Apply OCR and NLP to accounts payable workflows",
          "Automate vendor invoice processing",
          "Build a basic document classification pipeline",
        ],
      },
      {
        week: 5,
        topic: "AI Ethics & Data Quality in Accounting",
        description: "Governance, bias, and data quality considerations when deploying AI in finance",
        learningObjectives: [
          "Identify common data quality issues that corrupt AI outputs",
          "Understand liability when AI makes accounting errors",
          "Implement data validation pipelines",
        ],
      },
      {
        week: 6,
        topic: "The Future Accountant: Human + AI Collaboration",
        description: "How accounting professionals can adapt and thrive alongside AI systems",
        learningObjectives: [
          "Map which accounting tasks are automatable vs judgment-based",
          "Develop a personal AI adoption roadmap",
          "Evaluate emerging AI accounting certifications",
        ],
      },
    ],
  },
  {
    title: "Financial Analysis with Machine Learning",
    description:
      "Learn to apply machine learning models to financial analysis tasks: equity valuation, " +
      "credit risk scoring, earnings forecasting, and portfolio construction. Covers Python-based " +
      "ML workflows with real financial datasets. Intermediate level — familiarity with financial " +
      "statements and basic statistics required.",
    price: "25",
    category: "finance",
    syllabus: [
      {
        week: 1,
        topic: "Financial Data Sources & Feature Engineering",
        description: "Sourcing, cleaning, and engineering features from financial data",
        learningObjectives: [
          "Access financial data via APIs (Alpha Vantage, Yahoo Finance, EDGAR)",
          "Engineer financial ratios as ML features",
          "Handle missing data and outliers in financial time series",
        ],
      },
      {
        week: 2,
        topic: "Regression Models for Equity Valuation",
        description: "Predicting intrinsic value and price targets using regression",
        learningObjectives: [
          "Build linear and ridge regression models on fundamental data",
          "Interpret model coefficients in financial terms",
          "Cross-validate models using time-series splits",
        ],
      },
      {
        week: 3,
        topic: "Classification Models for Credit Risk",
        description: "Binary and multi-class classification for credit scoring and default prediction",
        learningObjectives: [
          "Train logistic regression and gradient boosting classifiers",
          "Interpret SHAP values for credit decisions",
          "Comply with model explainability requirements (ECOA, GDPR)",
        ],
      },
      {
        week: 4,
        topic: "Earnings Forecasting with Ensemble Methods",
        description: "Using Random Forests and XGBoost to forecast earnings per share",
        learningObjectives: [
          "Construct analyst consensus features",
          "Tune hyperparameters with financial evaluation metrics",
          "Benchmark ML forecasts against analyst estimates",
        ],
      },
      {
        week: 5,
        topic: "NLP for Financial News & Earnings Calls",
        description: "Sentiment analysis and topic modeling on earnings calls and news",
        learningObjectives: [
          "Apply BERT-based models to earnings call transcripts",
          "Build a news sentiment signal for stock screening",
          "Evaluate information coefficient (IC) of NLP signals",
        ],
      },
      {
        week: 6,
        topic: "Backtesting & Model Validation",
        description: "Rigorous out-of-sample testing of ML-based financial models",
        learningObjectives: [
          "Implement walk-forward validation",
          "Measure Sharpe ratio and max drawdown of model-based strategies",
          "Detect and avoid lookahead bias",
        ],
      },
      {
        week: 7,
        topic: "Deploying ML Models in Financial Workflows",
        description: "Productionizing ML models for use by analysts and traders",
        learningObjectives: [
          "Containerize a financial ML model with Docker",
          "Build a REST API for model inference",
          "Monitor model drift in production",
        ],
      },
    ],
  },
  {
    title: "AI-Powered Auditing & Compliance",
    description:
      "Comprehensive course on applying AI to internal audit, external audit, fraud detection, " +
      "and regulatory compliance. Covers continuous auditing frameworks, anomaly detection algorithms, " +
      "risk scoring models, and how regulators are approaching AI-generated audit evidence. Suitable " +
      "for auditors, risk officers, and compliance professionals.",
    price: "30",
    category: "finance",
    syllabus: [
      {
        week: 1,
        topic: "AI in the Audit Lifecycle",
        description: "Where AI adds value across planning, fieldwork, and reporting stages",
        learningObjectives: [
          "Map traditional audit steps to AI-assisted equivalents",
          "Understand sampling vs 100% population testing with AI",
          "Identify professional standards governing AI in audit (ISA, PCAOB)",
        ],
      },
      {
        week: 2,
        topic: "Anomaly Detection for Transaction Monitoring",
        description: "Statistical and ML-based anomaly detection on financial transactions",
        learningObjectives: [
          "Implement Isolation Forest and Autoencoder anomaly detectors",
          "Tune detection thresholds to control false positive rates",
          "Build a transaction monitoring dashboard",
        ],
      },
      {
        week: 3,
        topic: "Fraud Detection with Machine Learning",
        description: "Supervised and unsupervised fraud detection across payments, procurement, and expense reports",
        learningObjectives: [
          "Handle extreme class imbalance in fraud datasets (SMOTE, cost-sensitive learning)",
          "Detect Benford's Law deviations as a fraud signal",
          "Build a vendor fraud scoring model",
        ],
      },
      {
        week: 4,
        topic: "Continuous Auditing & Real-Time Risk Monitoring",
        description: "Designing systems that audit transactions as they occur",
        learningObjectives: [
          "Architect a continuous auditing pipeline",
          "Define key risk indicators (KRIs) and automate their calculation",
          "Integrate audit alerts into ERP systems",
        ],
      },
      {
        week: 5,
        topic: "Regulatory Compliance Automation",
        description: "Using AI to monitor compliance with AML, SOX, IFRS, and GDPR",
        learningObjectives: [
          "Automate AML transaction screening with ML",
          "Map SOX controls to automated test procedures",
          "Generate compliance reports with AI-assisted narrative generation",
        ],
      },
      {
        week: 6,
        topic: "AI Audit Evidence & Legal Admissibility",
        description: "Ensuring AI-generated audit findings meet legal and regulatory standards",
        learningObjectives: [
          "Document AI model decisions for audit trails",
          "Understand when AI evidence is admissible in enforcement actions",
          "Design a model governance framework for audit AI",
        ],
      },
      {
        week: 7,
        topic: "Case Studies: AI Audit in Practice",
        description: "Real-world deployments of AI auditing at major firms and regulators",
        learningObjectives: [
          "Analyze KPMG, Deloitte, and EY AI audit programs",
          "Review SEC and PCAOB guidance on AI in auditing",
          "Design a pilot AI audit program for a sample organization",
        ],
      },
    ],
  },
  {
    title: "Algorithmic Trading & AI Portfolio Management",
    description:
      "Build and evaluate algorithmic trading strategies powered by machine learning. Covers " +
      "strategy design, signal generation, execution algorithms, portfolio optimization, and risk " +
      "management. Students will implement full trading backtests in Python. Advanced level — requires " +
      "working knowledge of statistics and financial markets.",
    price: "50",
    category: "finance",
    syllabus: [
      {
        week: 1,
        topic: "Market Microstructure & Data Infrastructure",
        description: "Understanding how markets work and setting up data pipelines for algo trading",
        learningObjectives: [
          "Understand order types, market making, and bid-ask dynamics",
          "Set up a tick data pipeline with WebSocket feeds",
          "Normalize and store OHLCV data for strategy development",
        ],
      },
      {
        week: 2,
        topic: "Alpha Signal Generation with ML",
        description: "Developing predictive signals using machine learning",
        learningObjectives: [
          "Engineer momentum, mean-reversion, and value signals",
          "Evaluate signal quality with Information Coefficient and Sharpe",
          "Combine signals with ML-based signal weighting",
        ],
      },
      {
        week: 3,
        topic: "Backtesting Frameworks & Common Pitfalls",
        description: "Building robust backtests and avoiding survivorship and lookahead bias",
        learningObjectives: [
          "Implement an event-driven backtester",
          "Account for transaction costs, slippage, and market impact",
          "Use walk-forward and Monte Carlo simulation for validation",
        ],
      },
      {
        week: 4,
        topic: "Deep Learning for Price Prediction",
        description: "LSTM, Transformer, and CNN architectures for financial time series",
        learningObjectives: [
          "Build and train an LSTM model on stock price data",
          "Apply attention mechanisms to financial sequences",
          "Avoid overfitting in financial deep learning models",
        ],
      },
      {
        week: 5,
        topic: "Reinforcement Learning for Trading",
        description: "Training trading agents with RL algorithms",
        learningObjectives: [
          "Formulate trading as a Markov Decision Process",
          "Implement PPO and DQN trading agents",
          "Evaluate RL agents with proper out-of-sample testing",
        ],
      },
      {
        week: 6,
        topic: "Portfolio Optimization with AI",
        description: "Modern portfolio theory enhanced with ML-based return and risk forecasting",
        learningObjectives: [
          "Implement mean-variance optimization with ML-forecasted returns",
          "Apply Black-Litterman model with ML views",
          "Use hierarchical risk parity for robust allocation",
        ],
      },
      {
        week: 7,
        topic: "Execution Algorithms & Market Impact",
        description: "TWAP, VWAP, and ML-optimized order execution",
        learningObjectives: [
          "Implement TWAP and VWAP execution algorithms",
          "Model market impact with the Almgren-Chriss framework",
          "Build an optimal execution algorithm with RL",
        ],
      },
      {
        week: 8,
        topic: "Live Trading Infrastructure & Risk Controls",
        description: "Production deployment of algorithmic trading systems",
        learningObjectives: [
          "Connect to broker APIs (Interactive Brokers, Alpaca)",
          "Implement pre-trade and post-trade risk checks",
          "Build a real-time P&L and risk monitoring dashboard",
        ],
      },
    ],
  },
  {
    title: "AI for Financial Forecasting & Cash Flow Prediction",
    description:
      "Develop expertise in applying AI to financial planning and analysis (FP&A): revenue forecasting, " +
      "cash flow modeling, scenario analysis, and budget variance prediction. Covers classical time series " +
      "methods, deep learning forecasters, and probabilistic forecasting. Designed for FP&A analysts, " +
      "CFO office staff, and financial planners.",
    price: "20",
    category: "finance",
    syllabus: [
      {
        week: 1,
        topic: "Financial Forecasting Fundamentals",
        description: "The forecasting problem in finance: horizons, uncertainty, and evaluation metrics",
        learningObjectives: [
          "Define forecast horizons for different financial use cases",
          "Choose appropriate error metrics (MAE, MAPE, WAPE, sMAPE)",
          "Understand bias-variance tradeoff in financial forecasting",
        ],
      },
      {
        week: 2,
        topic: "Classical Time Series: ARIMA & ETS",
        description: "Traditional statistical forecasting methods and when to use them",
        learningObjectives: [
          "Implement ARIMA models for revenue forecasting",
          "Apply Holt-Winters exponential smoothing to seasonal financials",
          "Diagnose stationarity and cointegration in financial series",
        ],
      },
      {
        week: 3,
        topic: "Machine Learning for Structured Financial Forecasting",
        description: "Using gradient boosting and tree-based models for tabular financial data",
        learningObjectives: [
          "Build XGBoost revenue forecasts with lag features",
          "Engineer calendar and macro-economic features",
          "Cross-validate with time-series aware splits",
        ],
      },
      {
        week: 4,
        topic: "Deep Learning Forecasters: N-BEATS, TFT, and PatchTST",
        description: "State-of-the-art neural forecasting architectures for financial data",
        learningObjectives: [
          "Implement N-BEATS for univariate revenue forecasting",
          "Apply Temporal Fusion Transformer (TFT) for multi-variate cash flow",
          "Fine-tune pre-trained time series foundation models",
        ],
      },
      {
        week: 5,
        topic: "Probabilistic Forecasting & Scenario Analysis",
        description: "Generating forecast distributions and stress-testing financial plans",
        learningObjectives: [
          "Generate prediction intervals with quantile regression",
          "Use Monte Carlo simulation for cash flow scenario analysis",
          "Build a CFaR (Cash Flow at Risk) model",
        ],
      },
      {
        week: 6,
        topic: "Working Capital & Liquidity Forecasting",
        description: "AI models for accounts receivable, payable, and cash conversion cycle",
        learningObjectives: [
          "Predict DSO (Days Sales Outstanding) with ML",
          "Automate cash flow forecasting from ERP transaction data",
          "Build a 13-week rolling cash flow forecast model",
        ],
      },
      {
        week: 7,
        topic: "Budget Variance Prediction & Anomaly Detection",
        description: "Early warning systems for budget overruns and financial anomalies",
        learningObjectives: [
          "Train a budget variance prediction model",
          "Implement real-time spend anomaly detection",
          "Integrate forecasts with FP&A platforms (Anaplan, Adaptive)",
        ],
      },
      {
        week: 8,
        topic: "Communicating AI Forecasts to Finance Stakeholders",
        description: "Presenting model outputs to CFOs, boards, and non-technical audiences",
        learningObjectives: [
          "Build executive-friendly forecast dashboards",
          "Explain model uncertainty in business terms",
          "Design a forecast governance and review cadence",
        ],
      },
    ],
  },
];
