# TalentForge AI — Technical Architecture & System Documentation

---

## 👨‍💻 Developer Profile

**Vaibhav Verma**  
*4th-Year Computer Science Undergraduate*  
*Guru Gobind Singh Indraprastha University (GGSIPU)*  

### Professional Summary
* Computer Science undergraduate with hands-on experience in software engineering, data engineering, and applied AI.
* Specialized in building cloud-based ETL pipelines on Azure Databricks and AI-powered full-stack applications using modern LLM APIs.

### Technical Skills Overview
* **Languages:** C++, Java, SQL, TypeScript, JavaScript
* **Backend & APIs:** REST API Design, Node.js, Next.js Server Actions, JWT Authentication, API Integration, Postman
* **Cloud & Data Engineering:** Microsoft Azure, Azure Databricks, Delta Lake, PySpark, AWS, Google BigQuery, ETL Pipeline Design, Data Modeling (Star Schema, SCD Type 1/2)
* **AI & LLMs:** LLM API Integration (Google Gemini, OpenAI), Prompt Engineering, Speech-to-Text / Text-to-Speech Integration
* **Frontend & Databases:** React, Next.js (App Router), Tailored CSS / WebGL Shaders, PostgreSQL, MongoDB Atlas, Prisma ORM, Redis
* **Software Engineering Practices:** Git, OOP, Data Structures & Algorithms, DBMS, CI/CD Pipeline Automation

---

# 🚀 TalentForge AI — System Architecture & Implementation

## 1. Executive Summary
**TalentForge AI** is an end-to-end, AI-native talent acquisition and hiring platform engineered to streamline candidate evaluation, automated Job Description (JD) generation, and recruiter-candidate workflows. Built on Next.js 14, MongoDB Atlas, Prisma ORM, and Google Gemini AI, TalentForge AI drastically reduces time-to-hire by integrating intelligent AI matching and modern WebGL visual interactions.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                    |
|                                                                                   |
|   +-----------------------+   +------------------------+   +------------------+   |
|   |  Candidate Portal     |   |  Recruiter Workspace   |   |   Super Admin    |   |
|   |  (Jobs, Applications) |   |  (Job Creation, JDs)   |   |   Control Panel  |   |
|   +-----------+-----------+   +-----------+------------+   +--------+---------+   |
+---------------+---------------------------+-------------------------+-------------+
                |                           |                         |
                +-------------------+- - - -+ - - - - - - - - - - - - +
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                               NEXT.JS 14 APPLICATION                              |
|                                                                                   |
|   +------------------------+  +----------------------+  +---------------------+   |
|   |  Client Components     |  |   NextAuth Middleware|  |  Server Components  |   |
|   |  (WebGL, Aurora UI)    |  |   (JWT / Session)    |  |  (App Router API)   |   |
|   +-----------+------------+  +-----------+----------+  +----------+----------+   |
+---------------+---------------------------+------------------------+--------------+
                |                           |                        |
                +-------------------+-------+------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                            BUSINESS LOGIC & INTEGRATIONS                          |
|                                                                                   |
|   +--------------------+  +----------------------+  +-------------------------+   |
|   |  Prisma ORM (v6)   |  |   Google Gemini AI   |  |   Resend Email Service  |   |
|   |  (Type Safety)     |  |   (JD Generation)    |  |   (Transactional Mails) |   |
|   +---------+----------+  +-----------+----------+  +------------+------------+   |
+-------------|-------------------------|--------------------------|----------------+
              |                         |                          |
              v                         v                          v
+-----------------------+     +-------------------+      +------------------+
|   MongoDB Atlas DB    |     |  Google AI Studio |      |  Resend API      |
|   (Document Store)    |     |  (LLM Inference)  |      |  (SMTP Transport)|
+-----------------------+     +-------------------+      +------------------+
```

---

## 3. Technology Stack & Architectural Justifications

| Technology | Selection Rationale & Engineering Advantage |
| :--- | :--- |
| **Next.js 14 (App Router)** | Provides Server-Side Rendering (SSR) for SEO-optimized job landing pages, combined with Server Actions & API routes for unified full-stack architecture. |
| **TypeScript** | Enforces strict compile-time type safety across API contracts, database models, and dynamic UI props. |
| **MongoDB Atlas + Prisma ORM (v6)** | Schema flexibility of MongoDB combined with Prisma's auto-generated, type-safe client for rapid schema iterations without raw query bugs. |
| **Google Gemini AI API** | Provides ultra-fast context processing and cost-efficient LLM inference for generating structured, high-conversion Job Descriptions and evaluation rubrics. |
| **NextAuth.js** | Provides robust OAuth (Google / GitHub) and credentials-based authentication with encrypted JWT session strategies. |
| **Resend API** | High-deliverability API-driven transactional email dispatch for instant recruiter alerts and application confirmations. |
| **WebGL & Custom Canvas Shader** | High-performance interactive visual layer (Aurora WebGL background) providing fluid 60fps responsive user experience. |

---

## 4. Core System Workflows

### A. AI Job Description (JD) Generation Pipeline
1. **Trigger:** Recruiter enters job title, core requirements, and target domain in the Recruiter Dashboard.
2. **Execution:** Next.js Server Route invokes the Google Gemini AI API with structured system prompts.
3. **Response:** Gemini returns formatted markdown including responsibilities, required skills, and compensation ranges.
4. **Persistence:** Recruiter reviews/edits the generated JD and saves it directly to MongoDB via Prisma ORM.

### B. Role-Based Access & Super Admin Hierarchy
1. **Session Resolution:** NextAuth resolves JWT tokens on every request.
2. **Access Control:** `SUPER_ADMIN_EMAIL` and `ADMIN_EMAILS` environment configurations grant elevated permissions.
3. **Privileges:** Super Admins gain access to platform-wide metrics, candidate management, lead tracking, and organizational scopes.

### C. Candidate Application & Matching Flow
1. Candidates browse domain-specific tech stacks (AI/ML, Full Stack, Data Science, DevOps, QA).
2. Candidate applies with a single click; profile details and resumes are linked.
3. System triggers email notification to the recruiter via Resend API.

---

## 5. Database Schema Architecture (Prisma & MongoDB)

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  CANDIDATE
  RECRUITER
  ADMIN
}

model User {
  id                 String     @id @default(auto()) @map("_id") @db.ObjectId
  name               String?
  email              String     @unique
  emailVerified      DateTime?
  image              String?
  role               UserRole   @default(CANDIDATE)
  companySlug        String?
  onboardingComplete Boolean    @default(false)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  jobs               Job[]
  applications       Application[]
}

model Job {
  id           String        @id @default(auto()) @map("_id") @db.ObjectId
  title        String
  description  String
  domain       String
  location     String
  type         String
  salary       String?
  companyId    String        @db.ObjectId
  postedById   String        @db.ObjectId
  postedBy     User          @relation(fields: [postedById], references: [id])
  applications Application[]
  createdAt    DateTime      @default(now())
}

model Application {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  jobId       String   @db.ObjectId
  job         Job      @relation(fields: [jobId], references: [id])
  candidateId String   @db.ObjectId
  candidate   User     @relation(fields: [candidateId], references: [id])
  status      String   @default("PENDING")
  appliedAt   DateTime @default(now())
}
```

---

## 6. Future Expansion & Advanced Roadmap

> *Note: While TalentForge AI is already production-grade, as a Computer Science engineer with strong data & cloud engineering background, the system architecture can be scaled further:*

1. **AI Voice & WebRTC Interviewing System:**
   * Integrate WebRTC with Bland AI / OpenAI Realtime API for automated 1-on-1 preliminary voice screening interviews.
2. **RAG-Powered Vector Resume Parsing:**
   * Build an automated ETL pipeline using Azure Databricks / Python to chunk candidates' resumes into vector embeddings stored in Pinecone/Qdrant for semantic match scoring against job requirements.
3. **Multi-Tenant Enterprise Isolation:**
   * Expand organization scoping to support isolated enterprise subdomains (`company.talentforge.ai`) with custom SSO (SAML/Okta) integration.
4. **Real-time Predictive Hiring Analytics:**
   * Implement automated candidate funnel analytics using BigQuery / Delta Lake to predict candidate drop-off and time-to-fill metrics.

---

## 7. Conclusion
**TalentForge AI** demonstrates the seamless integration of modern Web development standards (Next.js 14, TypeScript), robust database engineering (Prisma, MongoDB), and cutting-edge Generative AI APIs (Google Gemini). Created & maintained by **Vaibhav Verma**, this project represents a scalable, enterprise-ready hiring engine built from the ground up.
