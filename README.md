# Electricity Fault Dashboard 🔌

A modern, real-time dashboard for monitoring and managing electricity faults across power distribution networks. Built with React and Vite for a fast, responsive user experience.

## What is This Project?

This is the frontend dashboard for a power fault detection and management system. It displays real-time electricity fault data, alert notifications, cloud analysis results, and live monitoring information from poles and areas across the power grid. The dashboard helps operators quickly identify issues and take action.

## Key Features

- **Live Monitoring** - Real-time updates of power grid status and fault detection
- **Alert Management** - View all active alerts and manage them efficiently
- **Area Analysis** - Monitor faults by geographical area
- **Cloud Integration** - View cloud-based analysis and processing results
- **Pole Search** - Search and locate specific poles in the network
- **Live Dashboard** - See all current metrics and status at a glance
- **Quick Overview** - Get a summary of system health and key statistics
- **WebSocket Support** - Real-time data streaming for instant updates

## We will need below basic installations

Before you get started, make sure you have these installed on your computer:

- **Node.js** (version 14 or higher)
- **npm** (usually comes with Node.js)
- A running backend server (the API that provides the data)

## Getting Started

### Step 1: Install Dependencies

Open your terminal and navigate to this folder, then run:

```bash
npm install
```

This will download and install all the packages the project needs.

### Step 2: Start the Development Server

Run this command to start the dashboard:

```bash
npm run dev
```

Your browser should automatically open to `http://localhost:5173`. If not, just go there manually.

You should see the dashboard load with all the pages and real-time data streaming in!

## Available Commands

Here are the main commands you'll use:

```bash
# Start the development server
npm run dev

# Build for production
npm run build

```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AlertsTable.jsx     # Table for displaying alerts
│   ├── Header.jsx          # Top navigation bar
│   ├── Layout.jsx          # Main page layout wrapper
│   ├── Loader.jsx          # Loading spinner
│   ├── Sidebar.jsx         # Side navigation menu
│   ├── StatCard.jsx        # Card for displaying statistics
│   └── SummaryCard.jsx     # Card for summary information
├── pages/               # Full page components
│   ├── OverviewPage.jsx    # Main dashboard overview
│   ├── AlertsPage.jsx      # Alerts and incidents
│   ├── AreaPage.jsx        # Area-based monitoring
│   ├── CloudPage.jsx       # Cloud analysis results
│   ├── LiveDataPage.jsx    # Real-time data stream
│   └── PoleSearchPage.jsx  # Pole location search
├── services/            # API and WebSocket services
│   ├── api.js             # Backend API communication
│   └── websocket.js       # Real-time WebSocket updates
├── App.jsx              # Main app component
└── main.jsx             # Entry point
```

## How It Works

1. **Frontend** loads in your browser
2. **App connects** to the backend API and WebSocket server
3. **Real-time updates** stream in through WebSocket
4. **Dashboard displays** all the data in easy-to-read pages
5. **You manage** alerts and monitor the system from the UI

## Backend Connection

This dashboard expects a backend API running at a configured URL. Make sure:

- Your backend server is running
- The API is accessible from your machine
- WebSocket connection is enabled for real-time updates
- Any required environment variables are set in `.env` (if your backend needs them)


## Building for Production

When you're ready to deploy:

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder that's ready to deploy to a web server.

## Technology Stack

- **React** - UI framework
- **Vite** - Fast build tool and dev server
- **JavaScript** - Programming language
- **WebSocket** - Real-time communication
- **CSS** - Styling

## Project Status

This is an active project for monitoring electricity faults in power distribution networks. Feel free to contribute improvements and report any issues you find!