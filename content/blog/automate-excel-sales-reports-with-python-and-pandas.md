---
title: Automate Excel Sales Reports With Python and Pandas
date: 2026-10-30
category: Data Analytics & BI
coverImage: /assets/blog/automate-excel-sales-reports-with-python-and-pandas.png
summary: Manually combining weekly Excel sales files can consume hours and
  introduce duplicate rows, inconsistent dates, and reporting errors. This
  tutorial shows you how to use Python and Pandas to combine multiple Excel
  files, clean the data, calculate sales values, and create a Power BI-ready CSV
  automatically.
featured: true
---
## Automate Excel Sales Reports With Python and Pandas

## Set Up Your Reporting Project

```
text
sales-report/
├── input/
├── output/
└── generate_report.py
```

Place every `.xlsx` sales file inside the `input` folder.

Open your terminal inside `sales-report` and install the required packages:

```
pip install pandas openpyxl
```

Your Excel files should contain these columns:

```
Order_ID
Order_Date
Product
Quantity
Unit_Price
```

For example:

```
ORD001 | 2026-10-01 | Laptop Stand | 2 | 18000
ORD002 | 2026-10-01 | Keyboard     | 1 | 25000
```

## 2. Combine and Clean the Excel Files

Create `generate_report.py` and add this complete script:

```
from pathlib import Path
import pandas as pd

INPUT_FOLDER = Path("input")
OUTPUT_FOLDER = Path("output")
OUTPUT_FILE = OUTPUT_FOLDER / "sales_report.csv"

OUTPUT_FOLDER.mkdir(exist_ok=True)

files = list(INPUT_FOLDER.glob("*.xlsx"))

if not files:
    raise FileNotFoundError("No Excel files found inside the input folder.")

dataframes = []

for file in files:
    df = pd.read_excel(file)
    df["Source_File"] = file.name
    dataframes.append(df)

sales = pd.concat(dataframes, ignore_index=True)

required_columns = [
    "Order_ID",
    "Order_Date",
    "Product",
    "Quantity",
    "Unit_Price"
]

missing = [column for column in required_columns if column not in sales.columns]

if missing:
    raise ValueError(f"Missing required columns: {missing}")

sales["Order_Date"] = pd.to_datetime(
    sales["Order_Date"],
    errors="coerce"
)

sales["Quantity"] = pd.to_numeric(
    sales["Quantity"],
    errors="coerce"
)

sales["Unit_Price"] = pd.to_numeric(
    sales["Unit_Price"],
    errors="coerce"
)

sales = sales.dropna(
    subset=["Order_ID", "Order_Date", "Quantity", "Unit_Price"]
)

sales = sales.drop_duplicates(subset=["Order_ID"])

sales["Sales_Value"] = sales["Quantity"] * sales["Unit_Price"]

sales.to_csv(OUTPUT_FILE, index=False)

print(f"Processed {len(files)} files.")
print(f"Exported {len(sales):,} transactions.")
print(f"Report saved to: {OUTPUT_FILE}")
```

Run it with:

```
python generate_report.py
```

Python reads every Excel workbook in `input`, combines the records, validates important columns, converts incorrect values, removes duplicate order IDs, and calculates sales revenue.

The calculation is:

```
Sales Value = Quantity × Unit Price
```

An order containing 4 units priced at ₦15,000 therefore produces a sales value of ₦60,000.

## 3. Connect the Output to Power BI

Your script creates:

```
output/sales_report.csv
```

In Power BI Desktop:

1. Select **Get Data**.
2. Choose **Text/CSV**.
3. Select `sales_report.csv`.
4. Confirm the data types.
5. Load the dataset.

You can then create measures such as total sales:

```
Total Sales =
SUM(sales_report[Sales_Value])
```

You can also calculate total orders:

```
Total Orders =
DISTINCTCOUNT(sales_report[Order_ID])
```



When new Excel files arrive, place them inside `input` and run the Python script again. Refresh Power BI after the CSV has been regenerated.

This workflow gives you one repeatable reporting process instead of rebuilding your dataset manually every week.

If your business needs automated Excel reporting, Power BI dashboards, Python data processing, database development, or workflow automation, YOLETECH can help you design and implement the solution.

Visit [https://yolestica.com/services](https://yolestica.com)

Email: [yoletech@yolestica.com](mailto:yoletech@yolestica.com)


WhatsApp: +2348025526389
