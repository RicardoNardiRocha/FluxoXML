# **App Name**: FiscalFlow

## Core Features:

- XML Import and Validation: Import and automatically validate multiple NF-e XML files simultaneously, ensuring each XML is processed only once.
- Intelligent Data Extraction: Extract relevant fiscal data (Número da nota, Série, Data de emissão, Chave da NF-e, Emitente, Destinatário, CFOP, Situação da nota, Valores totais, Bases e valores de impostos) from XML files while ignoring non-essential information.
- Automated Livro de Saída Generation: Generate the Livro de Saída from the processed fiscal records, providing both detailed (nota por nota) and consolidated (per period and operation type) views.
- Filtering and Consultation: Enable users to filter the Livro de Saída by period, client, CFOP, note status, and operation type for instant consultations.
- Fiscal Accuracy: Ensure the Livro de Saída respects note cancellations and accurately reflects the fiscal situation, ready for accounting reconciliation and tax reporting.
- Data Export: Allow exporting the Livro de Saída in various formats (visual report, spreadsheet, file for fiscal and accounting use).
- Asynchronous data handling: Implement asynchronous background processing to prevent UI blocking during data import and processing tasks.

## Style Guidelines:

- Primary color: Deep blue (#1E3A8A) for trust and reliability. A professional and calming hue appropriate for fiscal applications.
- Background color: Light gray (#F0F4F8), a desaturated version of the primary color, to ensure a clean and unobtrusive backdrop.
- Accent color: Yellow-orange (#D97706) to provide contrast for interactive elements and key information.
- Body and headline font: 'Inter', a grotesque-style sans-serif, will ensure a modern and objective look throughout the application.
- Use minimalist, clear icons for actions and navigation.
- A clean, well-structured layout for clear data presentation.
- Subtle transitions to enhance user experience without distracting from important data.