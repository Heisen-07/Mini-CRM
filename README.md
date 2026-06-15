# Xeno CRM – AI-Native Customer Engagement Platform

## Live Demo

**Frontend: https://xeno-crm-brown.vercel.app/dashboard

---

## Overview

Xeno CRM is an AI-native customer engagement platform built for consumer brands to intelligently reach shoppers, create targeted campaigns, track communication performance, and generate actionable business insights.

The system enables marketers to:

* Manage customers and orders
* Create audience segments using natural language
* Generate complete campaigns using AI
* Launch campaigns across simulated channels
* Track delivery and engagement events
* Attribute revenue to campaigns
* Generate AI-powered business insights

Unlike traditional CRMs that only provide dashboards and filters, Xeno CRM integrates AI directly into the campaign lifecycle, helping marketers decide:

* Who to target
* What message to send
* Which channel to use
* What actions to take next

---

# Architecture

## High-Level Architecture

```text
                 ┌─────────────────┐
                 │    Frontend     │
                 │ Next.js 16      │
                 │ TypeScript      │
                 └────────┬────────┘
                          │
                    REST API
                          │
                          ▼
                 ┌─────────────────┐
                 │     CRM API     │
                 │ Express 5       │
                 │ Prisma ORM      │
                 └───────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │                              │
          ▼                              ▼
 ┌─────────────────┐          ┌─────────────────┐
 │ Supabase        │          │ Gemini 2.5 Flash│
 │ PostgreSQL      │          │ AI Engine       │
 └─────────────────┘          └─────────────────┘

                         │
                         ▼

                 ┌─────────────────┐
                 │ Channel Service │
                 │ Express 5       │
                 └─────────────────┘
```

---

# Campaign Lifecycle

```text
Marketer Goal
      ↓
AI Campaign Generation
      ↓
Audience Segmentation
      ↓
Campaign Draft
      ↓
Launch Campaign
      ↓
Channel Service
      ↓
Delivery Events
      ↓
Receipt API
      ↓
Analytics
      ↓
AI Insights
```

---

# Core Features

## Customer Management

* Create and manage shoppers
* Track spending and order history
* Search and filter customers
* Maintain purchase statistics

---

## Order Management

* Record customer purchases
* Automatically update customer metrics
* Support campaign attribution
* Maintain revenue tracking

---

## AI-Powered Audience Segmentation

Example:

"Reactivate customers who haven't purchased in 30 days"

AI converts natural language into structured filters:

```json
{
  "inactiveDays": {
    "gt": 30
  }
}
```

The generated filter is executed against PostgreSQL using Prisma.

---

## AI Campaign Generation

Marketers describe a goal.

Example:

```text
Reward high value customers
```

AI generates:

* Campaign Name
* Audience Segment
* Channel Recommendation
* Personalized Message

This reduces campaign creation from multiple manual steps to a single interaction.

---

## Campaign Launch

When launched:

1. Audience is resolved
2. Communication records are created
3. Messages are sent to Channel Service
4. Delivery simulation begins

---

## Channel Simulation Service

The assignment required a separate delivery service.

The Channel Service:

* Receives communication requests
* Simulates delivery outcomes
* Sends asynchronous callbacks
* Updates CRM communication state

Example lifecycle:

```text
PENDING
   ↓
DELIVERED
   ↓
OPENED
   ↓
CLICKED
```

or

```text
PENDING
   ↓
FAILED
```

---

## Analytics Dashboard

Provides:

* Total Customers
* Total Orders
* Revenue
* Highest Value Customer
* Inactive Customers
* Geographic Distribution

---

## AI Business Insights

Instead of showing only metrics, AI acts as a business analyst.

Example:

* High-value customers contribute 60% of revenue
* 30 inactive customers require re-engagement
* Email campaigns outperform SMS by 20%

Insights are generated using real CRM metrics.

---

# Technology Stack

## Frontend

* Next.js 16
* TypeScript
* Tailwind CSS

### Why Next.js?

* Rapid development
* File-based routing
* Production-ready deployment
* Strong React ecosystem

---

## Backend

* Node.js
* Express 5
* TypeScript

### Why Express?

* Lightweight
* Fast development
* Flexible architecture

For this assignment, simplicity and delivery speed were prioritized over framework complexity.

---

## Database

* PostgreSQL
* Supabase
* Prisma ORM

### Why PostgreSQL?

Customer, order, campaign, and communication data are highly relational.

SQL relationships are more natural and efficient than a document database approach.

---

## AI

* Google Gemini 2.5 Flash

### Why Gemini?

* Fast response times
* Generous free tier
* Good structured JSON generation

---

## Deployment

### Frontend

* Vercel

### Backend

* Railway

### Database

* Supabase

---

# Design Decisions & Tradeoffs

## 1. Modular Monolith Instead of Microservices

### Chosen

CRM API + Separate Channel Service

### Why

The assignment explicitly required a separate delivery service.

A modular monolith reduced operational complexity while still demonstrating service boundaries.

### Tradeoff

Pros:

* Faster development
* Simpler deployment
* Easier debugging

Cons:

* Components cannot scale independently

Future:

* Extract AI and Analytics into dedicated services.

---

## 2. Webhooks Instead of Polling

### Chosen

Callback-based receipt architecture.

### Why

Matches real-world providers such as Twilio and SendGrid.

### Tradeoff

Pros:

* Real-time updates
* Lower network overhead

Cons:

* Requires retry handling

Future:

* Add retry queues and dead-letter processing.

---

## 3. Segment Resolution at Campaign Creation

### Chosen

AI converts audience definitions into executable filters before launch.

### Why

Campaign launch remains deterministic.

No AI dependency during sending.

### Tradeoff

Pros:

* Faster launches
* Predictable execution

Cons:

* Audience may change between draft creation and launch

Future:

* Add audience refresh before launch.

---

## 4. AI Insight Caching

### Chosen

Snapshot-based caching.

### Why

Avoid unnecessary AI calls.

### Tradeoff

Pros:

* Lower cost
* Faster dashboard load

Cons:

* Insights may become stale

Future:

* Add automatic refresh jobs.

---

# Scalability Considerations

## Current Scale

Supports:

* Hundreds of customers
* Thousands of communications

without additional infrastructure.

---

## Future Improvements

At larger scale:

* Redis + BullMQ
* Event-driven architecture
* Read replicas
* Message queues
* WebSocket updates
* AI service separation
* Kubernetes deployment

---

# What Was Intentionally Not Built

To focus on core CRM and AI functionality, the following were intentionally excluded:

* Authentication
* Multi-tenancy
* Real messaging providers
* A/B testing
* Campaign scheduling
* WebSockets
* CI/CD pipelines
* Queue infrastructure
* Advanced monitoring

These features would be added in a production-grade implementation.

---

# AI-Native Philosophy

This project was built around a simple idea:

Traditional CRM systems provide data.

AI-native CRM systems provide decisions.

The goal was not to add a chatbot to a CRM.

The goal was to embed AI directly into the marketer's workflow so that audience selection, campaign creation, analysis, and optimization become faster and more intelligent.

---

# Author

Vaibhav Kumar Singh

B.Tech Information Technology
