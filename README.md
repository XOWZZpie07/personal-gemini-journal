# 🧠 Gemini Journal & Reflections

A secure, AI-powered personal journaling application built with **Google AI Studio, Gemini, Firebase, Firestore, and Cloud Run**.

Gemini Journal helps users capture personal reflections, understand their emotional tone, discover recurring themes, and make journaling more engaging with an animated companion.

## ✨ Features

### 🔐 Secure Authentication

* Firebase Google Sign-In authentication.
* Each user's journal data is isolated from other users.
* Owner-bound Firestore data access.

### 🤖 Gemini-Powered Reflections

* Multi-turn AI conversations for deeper journal reflection.
* Multiple cognitive modes:

  * Deep Reflection
  * Key Summary
  * Brainstorm Ideas
  * Mindset Reframe
  * Action Steps
* Gemini API requests are handled server-side.

### 🧠 Automatic Mood Analysis

* Gemini automatically detects the emotional tone of submitted reflections.
* Supported moods include:

  * Happy
  * Excited
  * Calm
  * Neutral
  * Sad
  * Stressed
  * Frustrated
  * Grateful
* Each analysis includes a confidence score and short explanation.
* User-selected mood remains separate from AI-detected mood.

### 📊 Mood Trends

* View mood history across:

  * Last 7 Days
  * Last 30 Days
  * All History
* Shows emotional distribution and dominant tones.
* AI Tone Verification indicates how many eligible reflections have valid AI-generated mood analysis.

### 💡 Personal AI Insights

Gemini analyzes the user's own journal history to identify:

* Recurring themes
* Growth patterns
* Observed reflection themes
* Actionable micro-reframes

AI-generated insights are clearly distinguished from factual journal data.

### 🐾 Journal Companion — Mochi

An original animated virtual pet that makes journaling more engaging.

Mochi supports:

* Idle
* Walking
* Happy
* Celebrating
* Comforting
* Sleeping

The companion reacts to journal activity and detected emotional tone.

### 🛡️ Security & Privacy

* No API keys or secrets are exposed client-side.
* Gemini requests are routed through server-side endpoints.
* Firestore data is isolated by authenticated user.
* User-controlled inputs are validated and sanitized.
* AI-generated outputs are treated as untrusted data.
* Journal data is not shared between users.
* Error messages avoid exposing sensitive information.

### ⚡ Reliability

* Gemini fallback model ladder for improved resilience.
* Graceful timeout handling.
* Retry support when Gemini requests fail.
* Journal input is preserved when a request fails.
* Legacy journal entries are handled safely.

## 🏗️ Technology Stack

* **Frontend:** React, TypeScript
* **AI:** Google Gemini
* **Authentication:** Firebase Authentication
* **Database:** Cloud Firestore
* **Backend:** Node.js / Express
* **Deployment:** Google Cloud Run
* **Development:** Google AI Studio
* **Version Control:** GitHub

## ☁️ Deployment

The application is deployed on Google Cloud Run.

### Production URL

https://journal-reflect-app.ai.studio

### Cloud Run Service

`gemini-journal-reflections`

### Region

`asia-southeast1`

## 🚀 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/XOWZZpie07/personal-gemini-journal.git
cd personal-gemini-journal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file locally and provide the required Firebase and server-side Gemini configuration.

**Never commit `.env` files, API keys, service-account files, or other secrets to GitHub.**

### 4. Start the development server

```bash
npm run dev
```

## 🔒 Firestore Security

The application uses authenticated, owner-bound data access.

Personal journal data follows the user's authenticated identity and is designed to prevent cross-user data access.

Firestore security rules should remain restrictive and must never use insecure rules such as:

```text
allow read, write: if true;
```

## 🧪 Testing

The application has been tested for:

* Firebase authentication
* Journal creation and persistence
* Gemini reflection responses
* Automatic mood analysis
* Mood dashboard calculations
* AI Tone Verification
* Personal AI Insights
* Journal Companion behavior
* Error and timeout handling
* Retry behavior
* User data isolation
* Responsive UI
* Production build

## 🌟 Built With Google AI Studio

Google AI Studio was used to develop and iterate on the application with production-focused security directives covering:

* Threat modeling
* Secure coding
* Firestore user isolation
* Secret management
* Gemini fallback handling
* Error handling
* Accessibility
* Feature stability

## 📌 Project

**Gemini Journal & Reflections**

A personal, secure space to reflect, understand emotional patterns, and grow through AI-assisted journaling.
