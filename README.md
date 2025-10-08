🧠 AI Quiz Generator: Full-Stack Content Creation
This project is a modern, full-stack web application designed to demonstrate proficiency in creating a data-driven application powered by Generative AI. It allows users to input any topic and instantly generates a structured, interactive quiz.


🚀 Key Features
Generative AI Core: Dynamically generates complex quiz content (question, options, and correct answer) using the Google Gemini API based solely on user-defined topics.

Full-Stack Architecture: Built with a decoupled React frontend and a traditional Node.js/Express backend, providing a stable, scalable API layer.

Interactive Logic: Implements client-side state management (React Hooks) for user interaction, providing instant visual feedback (green/red highlights).

Modern UI/UX: Features a custom, responsive Dark Theme with professional gradient accents (Deep Blue/Orange) and subtle CSS animations, optimized for a clean user experience.

Robust Data Handling: The Node.js API implements critical JSON cleaning and validation logic to reliably parse structured data from the LLM's text output.

⚙️ Technology Stack
Component

Technology

Role

Frontend

React, JavaScript

Dynamic UI, component logic, and score tracking.

Backend

Node.js, Express.js

API server, routing, and middleware management.

AI/API

Google Gemini API (gemini-2.5-flash)

Generative engine for content creation.


🛠️ Setup and Local Development
To run this project locally, you need two separate terminals running the client and server components.

Prerequisites
Node.js (v16+)

npm (or yarn)

A Gemini API Key

1. Backend Setup
Navigate to the server directory, install dependencies, and run the Express server.

# 1. Navigate to the server folder
cd server

# 2. Install dependencies (express, cors, google-generative-ai, etc.)
npm install

# 3. Create a .env file in the server folder and add your key
# File: server/.env
# GEMINI_API_KEY=YOUR_API_KEY_HERE

Run the server:

node server.js

(The API must be running on http://localhost:5000)

2. Frontend Setup
Open a separate terminal, navigate to the client directory, and start the React application.

# 1. Navigate to the client folder
cd client

# 2. Install React dependencies
npm install

Run the client:

npm start
