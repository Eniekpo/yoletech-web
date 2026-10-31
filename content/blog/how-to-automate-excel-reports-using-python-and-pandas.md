---
title: How to Automate Excel Reports Using Python and Pandas
date: 2026-10-31
category: Data Analytics & BI
coverImage: /assets/blog/automating-excel-reports-with-python-and-pandas.png
summary: Manually preparing weekly Excel reports can consume several hours,
  especially when you process multiple files, clean inconsistent records, and
  calculate business performance metrics. This article explains how to automate
  Excel reporting with Python and Pandas, including data consolidation,
  cleaning, calculations, and exporting a formatted report ready for business
  use.
featured: true
---
# How to Automate Excel Reports Using Python and Pandas

## Introduction: The Problem with Manual Excel Reporting

Imagine managing sales records for a business with 5 regional offices. Each office submits a separate Excel file containing approximately 2,000 transactions every week.

That gives you 10,000 records to combine, clean, analyze, and summarize.

If you spend 15 minutes processing each file and another 2 hours preparing the final report, you could lose more than 3 hours every week to repetitive tasks.

Python and Pandas can automate this process. You can combine multiple Excel files, remove duplicates, calculate sales performance, and generate a consolidated report with a reusable script.

Let's build one.

## 1. Install the Required Python Libraries

You need Python 3.10 or later and three libraries:

* pandas: Data manipulation and analysis.
* openpyxl: Reading and writing Excel files.
* pathlib: Managing file and folder paths. This comes with Python.

Open your terminal in VS Code and run:

```python
pip install pandas openpyxl
```

Create this project structure:

```
excel-report-automation/
│
├── data/
│   ├── sales_january.xlsx
│   ├── sales_february.xlsx
│   └── sales_march.xlsx
│
├── output/
│
└── automate_report.py
```

Each Excel file should contain these columns:

Date             Region           Product             Quantity           Unit_Price

## 2. Combine and Clean Multiple Excel Files

The first step is to read every Excel file from your data folder and combine the records into one dataset.

Open `automate_report.py` and add:

```
import pandas as pd
from pathlib import Path

# Define project folders
DATA_FOLDER = Path("data")
OUTPUT_FOLDER = Path("output")

# Create output folder if it doesn't exist
OUTPUT_FOLDER.mkdir(exist_ok=True)

# Find all Excel files
excel_files = list(DATA_FOLDER.glob("*.xlsx"))

if not excel_files:
    raise FileNotFoundError("No Excel files found in the data folder.")

# Read and combine all files
dataframes = []

for file in excel_files:
    df = pd.read_excel(file)
    dataframes.append(df)

sales = pd.concat(dataframes, ignore_index=True)

# Clean column names
sales.columns = sales.columns.str.strip()

# Remove duplicate records
sales.drop_duplicates(inplace=True)

# Remove records with missing essential values
sales.dropna(
    subset=["Date", "Region", "Product", "Quantity", "Unit_Price"],
    inplace=True
)

# Convert data types
sales["Date"] = pd.to_datetime(sales["Date"], errors="coerce")
sales["Quantity"] = pd.to_numeric(
    sales["Quantity"], errors="coerce"
)
sales["Unit_Price"] = pd.to_numeric(
    sales["Unit_Price"], errors="coerce"
)

# Remove invalid records
sales.dropna(
    subset=["Date", "Quantity", "Unit_Price"],
    inplace=True
)

sales = sales[
    (sales["Quantity"] > 0) &
    (sales["Unit_Price"] >= 0)
]

print("Total cleaned records:", len(sales))
```

### What this code does:

1. Locates every Excel file inside the data folder.
2. Reads each file using Pandas.
3. Combines all records into one DataFrame.
4. Removes duplicate records.
5. Handles missing and invalid values.
6. Converts dates and numerical columns into appropriate data types.

Always inspect your data before removing records. Missing values and duplicate-looking transactions may require different treatment depending on your business rules.

## 3. Calculate Business Performance and Export the Report

Now calculate revenue and summarize sales performance by region and product.

Add this code replace the previous section:

```
import pandas as pd
from pathlib import Path

# Define project folders
DATA_FOLDER = Path("data")
OUTPUT_FOLDER = Path("output")

# Create output folder if it doesn't exist
OUTPUT_FOLDER.mkdir(exist_ok=True)

# Find all Excel files
excel_files = list(DATA_FOLDER.glob("*.xlsx"))

if not excel_files:
    raise FileNotFoundError("No Excel files found in the data folder.")

# Read and combine all files
dataframes = []

for file in excel_files:
    df = pd.read_excel(file)
    dataframes.append(df)

sales = pd.concat(dataframes, ignore_index=True)

# Clean column names
sales.columns = sales.columns.str.strip()

# Rename columns to match required schema (if needed)
column_mapping = {
    "Date": "Order_Date",
    "Region": None,  # drop Region column if present
}
# Apply renaming, dropping any columns set to None
sales = sales.rename(columns={k: v for k, v in column_mapping.items() if v})
# Drop columns that are not needed (e.g., Region)
if "Region" in sales.columns:
    sales.drop(columns=["Region"], inplace=True)

# Add Order_ID as incremental identifier
sales.insert(0, "Order_ID", range(1, len(sales) + 1))

# Define required columns in order
REQUIRED_COLUMNS = [
    "Order_ID",
    "Order_Date",
    "Product",
    "Quantity",
    "Unit_Price",
]

# Ensure required columns exist after processing
missing = [col for col in REQUIRED_COLUMNS if col not in sales.columns]
if missing:
    raise ValueError(f"Missing required columns after processing: {missing}")

# Keep only required columns
sales = sales[REQUIRED_COLUMNS]

# Remove duplicate records
sales.drop_duplicates(inplace=True)

# Remove records with missing essential values
sales.dropna(subset=REQUIRED_COLUMNS, inplace=True)

# Convert data types
sales["Order_Date"] = pd.to_datetime(sales["Order_Date"], errors="coerce")
sales["Quantity"] = pd.to_numeric(sales["Quantity"], errors="coerce")
sales["Unit_Price"] = pd.to_numeric(sales["Unit_Price"], errors="coerce")

# Remove invalid records (rows where conversion failed)
sales.dropna(subset=["Order_Date", "Quantity", "Unit_Price"], inplace=True)

# Filter out rows with non‑positive quantity or price
sales = sales[(sales["Quantity"] > 0) & (sales["Unit_Price"] >= 0)]

print("Total cleaned records:", len(sales))


# Calculate revenue
sales["Revenue"] = (
    sales["Quantity"] * sales["Unit_Price"]
)

# Summarize sales by region (if Region column exists)
if "Region" in sales.columns:
    regional_report = (
        sales.groupby("Region", as_index=False)
        .agg(
            Total_Quantity=("Quantity", "sum"),
            Total_Revenue=("Revenue", "sum"),
            Total_Transactions=("Revenue", "count")
        )
        .sort_values("Total_Revenue", ascending=False)
    )
else:
    regional_report = pd.DataFrame()

# Summarize sales by product
product_report = (
    sales.groupby("Product", as_index=False)
    .agg(
        Total_Quantity=("Quantity", "sum"),
        Total_Revenue=("Revenue", "sum")
    )
    .sort_values("Total_Revenue", ascending=False)
)

# Export all reports into one Excel workbook
output_file = OUTPUT_FOLDER / "sales_performance_report.xlsx"

with pd.ExcelWriter(
    output_file,
    engine="openpyxl"
) as writer:

    sales.to_excel(
        writer,
        sheet_name="Cleaned Sales",
        index=False
    )

    regional_report.to_excel(
        writer,
        sheet_name="Regional Performance",
        index=False
    )

    product_report.to_excel(
        writer,
        sheet_name="Product Performance",
        index=False
    )

print("Report generated successfully!")
print("Saved to:", output_file)


def format_currency_column(df, column):
    df[column] = df[column].apply(
        lambda x: f"${x:,.2f}" if pd.notna(x) else ""
    )
    return df
    
```

You now have one Excel workbook containing three worksheets:

* Cleaned Sales: Consolidated and cleaned transaction records.
* Regional Performance: Revenue and transaction summaries by region.
* Product Performance: Product sales and revenue rankings.

## 4. Run Your Automation Script

Save your Python file and open your terminal inside the project folder.

Run:

```
python automate_report.py
```

If everything works correctly, Python will generate:

```
output/sales_performance_report.xlsx
```

Whenever you receive new Excel files, place them inside the `data` folder and run the script again.

You can schedule this script using Windows Task Scheduler or Linux cron to generate reports automatically at a specified time.

## Practical Business Applications

You can adapt this automation process for:

* Monthly financial reporting.
* Inventory and stock monitoring.
* Customer transaction analysis.
* Employee performance reporting.
* Regional sales comparisons.
* Business intelligence reporting.

For larger reporting systems, you can connect Python to PostgreSQL or SQL Server and send the processed results to Power BI or Tableau.

## Conclusion

Automating Excel reports with Python and Pandas reduces repetitive work, improves reporting consistency, and gives you more time to investigate business performance.

Start with a simple reporting task, test your calculations, and gradually automate additional processes.

Need help building automated reporting systems for your business?

YOLETECH provides Python development, data analysis, business intelligence, web development, and AI workflow automation services.

Visit: [https://yolestica.com](https://yolestica.com/?utm_source=chatgpt.com)

Email: yoletech@yolestica.com

WhatsApp: +2348025526389

YOLETECH | Practical Technology. Data-Driven Solutions.
