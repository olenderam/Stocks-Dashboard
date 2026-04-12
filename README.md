# Stocks Dashboard

A real-time stocks portfolio dashboard built with Angular. This application provides a dynamic and responsive interface for tracking stock holdings, receiving live price updates via WebSockets, and visualizing portfolio composition.

<img width="1898" height="940" alt="image" src="https://github.com/user-attachments/assets/fcf4eedb-1652-419f-a1c0-6368bac104c1" />


## Features

- **Real-time Updates:** Utilizes WebSockets to receive and display live stock price changes without needing to refresh the page.
- **Dynamic Data Table:** Presents the stock portfolio in a clear table, showing company name, number of shares, and calculated net/gross values.
- **Visual Feedback:** Highlights updated table rows and displays trend indicators (↑ or ↓) to instantly communicate price movements.
- **Portfolio Visualization:** Includes a doughnut chart powered by Chart.js to visualize the distribution of shares among different companies.
- **Add Stocks:** A user-friendly dialog allows for adding new company stocks to the portfolio with input validation.
- **Connection Status:** Displays the current status of the WebSocket connection (Connected, Connecting, Reconnecting) for transparency on data freshness.
- **Modern State Management:** Leverages Angular Signals for efficient and reactive state management.
- **Robust Error Handling:** An HTTP interceptor catches API failures and presents user-friendly error messages.

## Tech Stack

- **Framework:** [Angular](https://angular.dev/) v20+
- **State Management:** Angular Signals
- **UI Components:** [PrimeNG](https://primeng.org/)
- **Charting:** [Chart.js](https://www.chartjs.org/)
- **Styling:** SCSS & [PrimeIcons](https://primeflex.org/primeicons)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Real-time Communication:** WebSockets
- **Async Operations:** [RxJS](https://rxjs.dev/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- [Angular CLI](https://angular.dev/tools/cli) installed globally

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/olenderam/stocks-dashboard.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd stocks-dashboard
    ```
3.  Install the necessary dependencies:
    ```sh
    npm install
    ```

### Running the Application

1.  Start the development server:

    ```sh
    npm start
    ```

    This command runs the application in development mode using `ng serve`.

2.  Open your browser and navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Project Structure

The project code is organized with a clear separation of concerns, making it easy to navigate and maintain.

```
src/
└── app/
    ├── core/           # Shared services, models, interceptors, tokens
    └── features/       # Feature-specific modules
        └── stocks/     # Contains all logic for the stocks dashboard
            ├── components/ # Dashboard, dialogs
            ├── services/   # State store, API, WebSocket, data mapper
            ├── constants/  # Feature-specific constants
            └── utils/      # Helper functions
```

- `core`: Contains application-wide logic such as HTTP interceptors, base API models, and dependency injection tokens for URLs.
- `features/stocks`: A self-contained feature module for the stocks dashboard.
  - `components`: Angular components for the UI, including the main `stock-dashboard` and the `add-stock-dialog`.
  - `services`:
    - `stock-store.service.ts`: The core of the application's state management, using Angular Signals to hold, compute, and update data for the view.
    - `stock-api.service.ts`: Handles all HTTP communication with the backend REST API for fetching and saving data.
    - `stock-ws.service.ts`: Manages the WebSocket lifecycle, including connection, automatic reconnection, and message parsing.
    - `stock-mapper.service.ts`: Transforms data from API and WebSocket responses into a consistent view model (`StockRow`) used by the components.

## Available Scripts

In the project directory, you can run the following `npm` scripts:

- `npm start`: Runs the app in development mode at `http://localhost:4200/`.
- `npm run build`: Builds the app for production into the `dist/` folder.
- `npm test`: Runs the unit tests using Karma and Jasmine.
- `npm run watch`: Builds the app in watch mode, automatically rebuilding on file changes.


## Notes on Requirements

The implementation follows the task requirements with the following assumptions and clarifications:

- The chart is rendered using PrimeNG `p-chart`, which uses Chart.js under the hood, so the Chart.js requirement is fulfilled.
- Based on the API documentation, `price_net` is returned by both the REST API and the WebSocket messages.
- In practice, the missing value concerns the gross price in WebSocket updates, not the net price. Therefore, gross values are derived from net values using the 23% VAT rate only when not present in the incoming update payload.
- The table is sorted by number of shares in descending order to keep it consistent with the chart, which also visualizes share distribution.
- For better chart readability, only the top companies are shown individually, while the remaining positions are aggregated into `Inne`.

## AI Assistance

AI tools were used as a supporting aid during an iterative development process, primarily for:

- discussing and validating architectural decisions,
- refining and simplifying selected parts of the implementation,
- exploring edge cases and improving code quality,
- generating example unit tests.

All code was reviewed, adjusted, and validated to ensure correctness, consistency, and full understanding of the solution.

## Author

Anna Olender · https://github.com/olenderam

Built as a recruitment task submission.
