---
title: From Housing Data to an Interactive ML App, Predicting Real Estate Prices
  with Python, Scikit-learn and Streamlit
date: 2026-10-31
category: Python & Machine Learning
coverImage: /assets/blog/real-estate-ml-model.png
summary: Machine learning becomes more useful when a model can move beyond a
  notebook and become something people can interact with.
featured: false
---
For this project, I developed an end-to-end real estate price prediction application using Python, Scikit-learn, Pandas, Streamlit and Plotly.

The objective was to build a regression model capable of estimating median house values from housing, demographic and geographical characteristics, while also creating a professional user interface where users can explore the underlying dataset, evaluate different machine-learning models and generate predictions interactively.

I used the California housing dataset, which contains more than 20,000 observations and includes variables such as geographical coordinates, housing age, number of rooms, population, household count, median income and proximity to the ocean.

Rather than treating the project only as a modelling exercise, I designed it as a complete machine-learning workflow covering:

1. Data acquisition and exploration
2. Data preprocessing
3. Missing-value treatment
4. Categorical-variable encoding
5. Train-test splitting
6. Regression modelling
7. Model evaluation
8. Pipeline development
9. Interactive prediction
10. Streamlit application development and visualization

The final application allows users to choose between Linear Regression, Random Forest Regression and Gradient Boosting Regression, review model-performance metrics and enter their own housing characteristics to generate an estimated median house value.

#### Step 1: Importing the Required Python Libraries

I started by importing the libraries required for data manipulation, machine learning, visualization and application development.

```
import numpy as np
import pandas as pd
import streamlit as st
import plotly.express as px

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from sklearn.model_selection import train_test_split

from sklearn.pipeline import Pipeline

from sklearn.preprocessing import (
    OneHotEncoder,
    StandardScaler
)
```

Each library had a specific role.

**Pandas and NumPy** handled data manipulation and numerical operations.

**Scikit-learn** was used for preprocessing, modelling and performance evaluation.

**Plotly** supported interactive visualizations.

**Streamlit** provided the interface through which users can interact with the model.

#### Step 2: Loading the Housing Dataset

The dataset for the project is publicly available from the Hands-On Machine Learning GitHub repository.

```
DATA_URL = (
    "https://raw.githubusercontent.com/ageron/handson-ml/"
    "master/datasets/housing/housing.csv"
)

data = pd.read_csv(DATA_URL)

I then inspected the dataset.

data.head()

I also checked its structure:

data.info()

And generated descriptive statistics:

data.describe()
```

#### Step 3: Separating Predictors from the Target Variable

I explicitly separated the numerical and categorical predictors.

```
TARGET = "median_house_value"

NUMERIC_FEATURES = [
    "longitude",
    "latitude",
    "housing_median_age",
    "total_rooms",
    "total_bedrooms",
    "population",
    "households",
    "median_income",
]

CATEGORICAL_FEATURES = [
    "ocean_proximity"
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

I then created the feature matrix X and target vector y.

X = data[FEATURES].copy()
y = data[TARGET].copy()
```

Keeping the predictors and target separate is important because the target should never accidentally become an input into the model used to predict itself.

#### Step 4: Splitting the Data into Training and Testing Sets

Before training the models, I divided the dataset into training and testing observations.

```
I allocated:

80% -> Training data
20% -> Testing data

The training dataset is used by the algorithm to learn relationships between the predictors and house values.

The test dataset remains unseen during training and is later used to assess how well the model generalizes to new observations.

I used:

random_state=42

to make the data split reproducible.
```

This means that rerunning the program will produce the same training and testing observations, making model comparisons more consistent.

#### Step 5: Handling Missing Numerical Values

Real-world datasets commonly contain missing information.

Instead of deleting every observation containing a missing value, I used Scikit-learn's `SimpleImputer`.

```
numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        ),
        (
            "scaler",
            StandardScaler()
        ),
    ]
)
```

The imputer replaces missing numerical observations with the median of the corresponding variable.

I selected median imputation because it is generally less influenced by extreme observations than mean imputation.

#### Step 6: Standardizing Numerical Variables

The numerical preprocessing pipeline also includes:

```
StandardScaler()

Standardization transforms variables approximately according to:

z = (x - mean) / standard deviation
```

This is particularly useful for algorithms such as Linear Regression when features operate on very different numerical scales.

Tree-based algorithms such as Random Forest do not normally require feature scaling, but maintaining a common preprocessing pipeline makes it easier to switch between models consistently within the application.

#### Step 7: Encoding the Categorical Variable

`ocean_proximity` is categorical rather than numerical.

Machine-learning algorithms generally require numerical inputs, so I transformed the categories using one-hot encoding.

```
categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(
                strategy="most_frequent"
            )
        ),
        (
            "onehot",
            OneHotEncoder(
                handle_unknown="ignore",
                sparse_output=False
            )
        ),
    ]
)
```

`OneHotEncoder` converts categories into separate binary features.

Using:

also helps prevent the prediction pipeline from failing if it encounters an unexpected category during inference.

#### Step 8: Combining the Preprocessing Operations

Instead of manually preprocessing each type of variable, I used a `ColumnTransformer`.

preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_pipeline,
            NUMERIC_FEATURES
        ),
        (
            "categorical",
            categorical_pipeline,
            CATEGORICAL_FEATURES
        ),
    ]
)

This is one of the aspects of the project I consider particularly important.

It creates a repeatable preprocessing architecture in which numerical variables and categorical variables receive their appropriate transformations.

It also reduces the risk of applying different preprocessing rules during training and prediction.

Step 9: Building a Baseline Linear Regression Model

I included Linear Regression as a baseline.

linear_model = LinearRegression()

A baseline model provides a useful reference point.

If a more sophisticated machine-learning algorithm cannot meaningfully outperform a simple linear model, then its additional complexity may not be justified.

The complete pipeline becomes:

linear_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", linear_model)
    ]
)

I then trained it:

linear_pipeline.fit(
    X_train,
    y_train
)

Step 10: Building a Random Forest Regression Model

Real estate relationships are not necessarily linear.

The influence of income, geographic location, housing age and population may interact in complex ways.

For this reason, I also implemented a Random Forest model.

random_forest = RandomForestRegressor(
    n_estimators=250,
    random_state=42,
    n_jobs=-1
)

I combined it with the same preprocessing pipeline.

rf_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", random_forest)
    ]
)

And trained the model.

rf_pipeline.fit(
    X_train,
    y_train
)

Random Forest is useful because it can capture nonlinear relationships and interactions between predictors without requiring those relationships to be manually specified.

Step 11: Adding Gradient Boosting Regression

I also included Gradient Boosting as another nonlinear model.

gradient_boosting = GradientBoostingRegressor(
    n_estimators=180,
    learning_rate=0.05,
    max_depth=3,
    loss="squared_error",
    random_state=42
)

The model was placed inside the same pipeline architecture.

gb_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", gradient_boosting)
    ]
)

And trained with:

gb_pipeline.fit(
    X_train,
    y_train
)

Having several models in the application gave me an opportunity to compare different modelling approaches rather than assuming that one algorithm would automatically be the best.

Step 12: Generating Predictions

After training a model, predictions can be generated using the unseen testing observations.

For example:

predictions = rf_pipeline.predict(X_test)

At this point:

y_test

contains the actual median house values, while:

predictions

contains the values estimated by the machine-learning model.

Comparing the two provides the basis for model evaluation.

Step 13: Evaluating Model Performance

I evaluated each model using three regression metrics:

Root Mean Squared Error (RMSE)

Mean Absolute Error (MAE)

Coefficient of Determination (R²)

The implementation was:

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

mae = mean_absolute_error(
    y_test,
    predictions
)

r2 = r2_score(
    y_test,
    predictions
)

print("RMSE:", rmse)
print("MAE:", mae)
print("R²:", r2)

These metrics provide different perspectives on model performance.

MAE measures the average absolute difference between actual and predicted values.

RMSE gives greater penalties to large prediction errors because errors are squared before averaging.

R² measures the proportion of variation in the target variable that the model explains.

A higher R² is generally preferable, while lower RMSE and MAE values indicate smaller prediction errors.

Rather than relying on a single metric, I included all three in the Streamlit dashboard.

Step 14: Examining Actual Versus Predicted Values

Model evaluation becomes easier to understand when numerical metrics are supported by visual diagnostics.

I created an evaluation dataframe.

evaluation = X_test.copy()

evaluation["Actual"] = y_test.values
evaluation["Predicted"] = predictions

evaluation["Residual"] = (
    evaluation["Actual"]
    - evaluation["Predicted"]
)

I then visualized actual values against predicted values.

fig = px.scatter(
    evaluation,
    x="Actual",
    y="Predicted",
    opacity=0.55,
    labels={
        "Actual":
        "Actual median house value ($)",

        "Predicted":
        "Predicted median house value ($)"
    }
)

st.plotly_chart(
    fig,
    use_container_width=True
)

Ideally, predictions should remain relatively close to the diagonal line representing perfect predictions.

This visualization makes systematic overprediction or underprediction easier to identify.

Step 15: Analysing Prediction Residuals

I also examined model residuals.

A residual is calculated as:

Residual = Actual Value - Predicted Value

The visualization was generated using:

fig = px.histogram(
    evaluation,
    x="Residual",
    nbins=45,
    labels={
        "Residual":
        "Actual - Predicted ($)"
    }
)

st.plotly_chart(
    fig,
    use_container_width=True
)

Residual analysis can provide additional insight into where a regression model performs well and where larger prediction errors occur.

Step 16: Building the Interactive Streamlit Application

Training a model was only one part of the project.

I wanted the result to be usable by someone who does not work directly with Python.

I therefore created a Streamlit web interface around the machine-learning pipeline.

The application contains five sections:

Overview
Data Explorer
Model Performance
Price Predictor
Methodology

Navigation was created using:

page = st.sidebar.radio(
    "Navigate",
    [
        "Overview",
        "Data Explorer",
        "Model Performance",
        "Price Predictor",
        "Methodology"
    ]
)

This transformed the project from a single modelling script into a small interactive analytics application.

Step 17: Creating an Interactive Data Explorer

One feature I wanted was the ability for users to investigate the underlying data before making predictions.

For example, users can filter properties by ocean proximity.

ocean_options = sorted(
    data["ocean_proximity"]
    .dropna()
    .unique()
    .tolist()
)

selected_ocean = st.multiselect(
    "Ocean proximity",
    options=ocean_options,
    default=ocean_options
)

They can also select a house-value range.

value_range = st.slider(
    "Median house value range ($)",
    min_value=int(
        data["median_house_value"].min()
    ),
    max_value=int(
        data["median_house_value"].max()
    ),
    value=(
        int(
            data["median_house_value"].min()
        ),
        int(
            data["median_house_value"].max()
        )
    ),
    step=5000
)

The filtered records can then be displayed interactively.

st.dataframe(
    filtered,
    use_container_width=True
)

I also included the option to download the resulting dataset.

st.download_button(
    "Download filtered CSV",
    data=filtered
        .to_csv(index=False)
        .encode("utf-8"),
    file_name="filtered_housing_data.csv",
    mime="text/csv"
)

This adds a practical data-analysis component beyond the prediction model itself.

Step 18: Building the Prediction Form

The main interactive feature allows a user to enter housing characteristics manually.

For example:

longitude = st.number_input(
    "Longitude"
)

latitude = st.number_input(
    "Latitude"
)

housing_median_age = st.number_input(
    "Median housing age"
)

total_rooms = st.number_input(
    "Total rooms"
)

total_bedrooms = st.number_input(
    "Total bedrooms"
)

population = st.number_input(
    "Population"
)

households = st.number_input(
    "Households"
)

median_income = st.number_input(
    "Median income"
)

ocean_proximity = st.selectbox(
    "Ocean proximity",
    ocean_options
)

The values entered by the user are converted into a Pandas dataframe.

prediction_input = pd.DataFrame(
    [
        {
            "longitude": longitude,
            "latitude": latitude,
            "housing_median_age":
                housing_median_age,
            "total_rooms": total_rooms,
            "total_bedrooms":
                total_bedrooms,
            "population": population,
            "households": households,
            "median_income": median_income,
            "ocean_proximity":
                ocean_proximity,
        }
    ]
)

The same trained pipeline can then predict the value.

predicted_value = pipeline.predict(
    prediction_input
)[0]

The result is displayed within the application.

st.metric(
    "Estimated Median House Value",
    f"${predicted_value:,.0f}"
)

One major advantage of using a complete Scikit-learn pipeline is that the user input automatically goes through the same imputation, scaling and encoding procedures used during model training.

Step 19: Making Model Selection Interactive

Rather than hard-coding one algorithm, I allowed users to select the regression model from the interface.

model_name = st.selectbox(
    "Prediction model",
    [
        "Random Forest",
        "Gradient Boosting",
        "Linear Regression"
    ]
)

A model-selection function determines which estimator should be used.

def make_estimator(model_name):

    if model_name == "Linear Regression":
        return LinearRegression()

    if model_name == "Gradient Boosting":
        return GradientBoostingRegressor(
            n_estimators=180,
            learning_rate=0.05,
            max_depth=3,
            random_state=42
        )

    return RandomForestRegressor(
        n_estimators=250,
        random_state=42,
        n_jobs=-1
    )

This makes the application useful not only for prediction, but also for demonstrating how different algorithms approach the same regression problem.

Step 20: Improving Application Performance with Streamlit Caching

Machine-learning applications can become unnecessarily slow if the dataset is downloaded and the model is retrained every time a user interacts with a control.

To reduce this overhead, I used Streamlit caching.

For data:

@st.cache_data(
    show_spinner=False
)
def load_data():

    return pd.read_csv(DATA_URL)

For the trained model:

@st.cache_resource(
    show_spinner=False
)
def train_model(model_name):

    # preprocessing
    # model training
    # evaluation

    return pipeline

This allows Streamlit to reuse previously computed resources instead of repeating expensive operations unnecessarily.

Step 21: Adding Geographic Visualization

Because latitude and longitude are part of the dataset, I incorporated geographic visualization into the application.

map_data = data[
    ["latitude", "longitude"]
].dropna()

st.map(
    map_data,
    latitude="latitude",
    longitude="longitude"
)

When a user enters coordinates into the prediction interface, the selected geographical point can also be displayed on a map.

This gives the application a stronger connection between machine-learning predictions and the geographical nature of real estate data.

Step 22: Designing the Application as a Data Product

One of my main objectives was not simply to produce a working model.

I wanted the interface to resemble a small analytical product.

I therefore incorporated:

A dashboard-style landing page
KPI cards
Interactive charts
Dataset filters
Correlation analysis
Geographic visualization
Model comparison
Model-performance metrics
Residual diagnostics
Feature influence
Interactive user inputs
Prediction results
Methodology documentation
Responsive Streamlit layout

I also used custom CSS to provide a cleaner visual hierarchy, improve spacing and create a more professional interface.

For example:

st.markdown(
    """
    <style>

    .hero {
        padding: 1.65rem 1.8rem;
        border-radius: 20px;

        background:
            linear-gradient(
                135deg,
                #0f172a 0%,
                #1e3a5f 100%
            );

        color: #ffffff;
    }

    </style>
    """,
    unsafe_allow_html=True
)

While visual design does not make a model more accurate, usability matters when analytical work needs to be communicated to decision-makers and nontechnical users.

The Complete Machine-Learning Workflow

The architecture of the project can be summarized as:

Raw California Housing Data
              ↓
        Data Exploration
              ↓
     Predictor Selection
              ↓
       Train/Test Split
              ↓
       Data Preprocessing
        ↙             ↘
Numeric Features     Categorical Feature
      ↓                     ↓
Median Imputation     Mode Imputation
      ↓                     ↓
Standardization       One-Hot Encoding
        ↘             ↙
         ColumnTransformer
                 ↓
        Scikit-learn Pipeline
                 ↓
     Regression Algorithms
        ↙       ↓        ↘
   Linear     Random    Gradient
 Regression   Forest    Boosting
        ↘       ↓        ↙
          Model Evaluation
                 ↓
       RMSE | MAE | R²
                 ↓
       Streamlit Interface
                 ↓
      Interactive Prediction

Skills Demonstrated Through the Project

This project allowed me to combine several areas of my data and analytics experience in one workflow:

Python programming: structuring reusable functions and application logic.

Data manipulation: using Pandas and NumPy to prepare and analyse structured data.

Exploratory data analysis: examining distributions, correlations and geographical patterns.

Data preprocessing: handling missing values, numerical features and categorical variables.

Machine learning: developing Linear Regression, Random Forest and Gradient Boosting regression models.

Scikit-learn pipelines: creating consistent preprocessing and modelling workflows.

Model evaluation: applying RMSE, MAE, R², actual-versus-predicted analysis and residual diagnostics.

Data visualization: building interactive analytical charts with Plotly.

Application development: converting a machine-learning workflow into a Streamlit application.

User experience: designing the interface around the needs of someone who wants insights and predictions without interacting directly with Python code.

What I Learned

A major takeaway from this project is that building a machine-learning model is only part of the solution.

For analytical work to create value, several components need to work together.

The dataset needs to be understood.

Missing and categorical information must be handled correctly.

The model must be evaluated on observations that were not used during training.

Preprocessing should remain consistent when new predictions are generated.

And finally, the results should be presented in a form that people can understand and interact with.

The use of Scikit-learn pipelines was particularly important because it allowed preprocessing and prediction to operate as one reproducible workflow.

The Streamlit application then provided the bridge between the underlying machine-learning system and the end user.

Project Limitations and Possible Improvements

The application should be viewed as a machine-learning and data-product demonstration rather than a live property valuation system.

The underlying data represents historical California housing districts rather than current individual property transactions.

A production real-estate valuation system could be expanded with more recent transaction data, exact property locations, property size, bedrooms and bathrooms at the individual-property level, renovation status, neighbourhood amenities, mortgage conditions, interest rates, school accessibility, crime indicators and other market variables.

I would also consider extending the modelling stage with techniques such as:

Cross-validation
Hyperparameter optimization
XGBoost or LightGBM
Feature engineering
Geospatial feature development
Model explainability with SHAP
Prediction intervals
Model monitoring
Cloud deployment
API development

These would make the solution more suitable for a production environment.

Conclusion

This project demonstrates an end-to-end approach to machine learning, from raw data to an interactive application.

Instead of stopping after fitting a regression algorithm, I combined data preparation, exploratory analysis, preprocessing, machine learning, evaluation, visualization and application development into one workflow.

The result is an interactive real estate analytics application that allows users to explore housing data, compare regression models and generate estimated median house values from selected property and geographical characteristics.

For me, this is also an example of how I approach data projects more broadly: the goal is not simply to build a model, but to turn data into an analytical solution that can be understood and used.

Technologies used: Python | Pandas | NumPy | Scikit-learn | Streamlit | Plotly | Machine Learning | Regression | Data Visualization
