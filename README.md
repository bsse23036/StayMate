# StayMate

**A Centralized Hostel & Mess Booking Marketplace**

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [AWS Services Used](#aws-services-used)
- [Implementation](#implementation)
- [Security](#security)
<!-- - [Setup & Deployment](#setup--deployment) -->
- [Results](#results)
- [Future Work](#future-work)
- [References](#references)

---

## Project Overview

StayMate is a centralized platform designed to simplify the process of searching, comparing, and booking verified hostels and mess facilities for university students. Traditional methods are often unreliable, time-consuming, or unverified. StayMate addresses this by providing a **secure, scalable, and user-friendly solution** built on **AWS Serverless Architecture**.

The platform ensures:

- Verified listings for hostels and messes
- Seamless booking flow
- Notifications for booking confirmations
- Cost-effective and scalable infrastructure

---

## Features

- **Search Hostels & Messes:** Filter by city, price range, and type
- **Property Details:** View images, descriptions, and mess menus
- **Booking System:** Create and manage bookings
- **Property Management:** Owners can upload and manage listings using pre-signed S3 URLs
- **Notifications:** Booking notifications via Amazon SNS

---

## Architecture

The system is designed with a **serverless architecture** for scalability and minimal operational overhead:

- **Frontend:** React.js hosted on Amazon S3 (Static Website Hosting)
- **Backend:** AWS Lambda functions (Node.js or Python)
- **API Layer:** Amazon API Gateway (REST API)
- **Authentication:** Amazon Cognito User Pools
- **Storage:** Amazon S3 for images and assets
- **Notifications:** Amazon SNS
- **Monitoring:** Amazon CloudWatch
- **Networking:** Conceptual use of VPC, private subnets, NAT Gateway, and NLB

![Architecture Diagram](architecture_diagram_placeholder.png)

---

## AWS Services Used

| Service                 | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| Amazon S3               | Static website hosting and image storage  |
| AWS Lambda              | Backend business logic                    |
| Amazon API Gateway      | RESTful APIs                              |
| Amazon Cognito          | Authentication & authorization            |
| Amazon SNS              | Booking notifications                     |
| Amazon CloudWatch       | Monitoring & logging                      |
| VPC / NAT Gateway / NLB | Network isolation and secure connectivity |

---

## Implementation

### Frontend

- Built with React.js and hosted on Amazon S3 as a static website
- Responsive UI with hostel search, property details, and booking pages

### Backend

- AWS Lambda functions implement business logic such as:
  - Searching listings
  - Creating bookings
  - Generating pre-signed URLs for image uploads
- API Gateway exposes REST endpoints to the frontend

### Image Upload Flow

1. User requests permission to upload images
2. Lambda generates a pre-signed S3 URL
3. User uploads image directly to S3
4. Image URL is stored in the database

### API Endpoints

| Method | Endpoint      | Description                |
| ------ | ------------- | -------------------------- |
| GET    | /hostels      | Fetch listings             |
| GET    | /hostels/{id} | Fetch details              |
| POST   | /booking      | Create a booking           |
| POST   | /upload-url   | Generate pre-signed S3 URL |

---

## Security

- Principle of **Least Privilege** applied in IAM roles
- **Cognito Authorizers** secure API Gateway endpoints
- Lambda functions run in private subnets (VPC)
- NAT Gateway used for controlled outbound access
- Private S3 buckets for image storage

---

## Results

- Users can successfully browse listings, book hostels, and receive notifications
- Property owners can manage listings with image uploads
- AWS monitoring ensures system logs and metrics are captured

---

## Future Work

- Integrate online payment gateways (Stripe, Razorpay)
- Develop a mobile application using React Native
- Implement AI-based recommendations for hostel matching
- Add analytics dashboards for owners and administrators

---

## References

- Amazon Web Services Documentation – https://docs.aws.amazon.com
- React.js Documentation – https://react.dev
- Tailwind CSS Documentation – https://tailwindcss.com/docs
- Roberts, M., Serverless Architectures on AWS, AWS Whitepapers
