# E-Way Bill Integration - Security Guidelines & Compliance

**Date:** 2025-11-20
**Project:** CMS (Distributor Management System)
**Classification:** CRITICAL - Contains security requirements for GST compliance

---

## Table of Contents
1. [Legal & Compliance Requirements](#legal--compliance-requirements)
2. [Data Security Requirements](#data-security-requirements)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Audit Trail Requirements](#audit-trail-requirements)
7. [Data Privacy (GDPR/DPDPA)](#data-privacy-gdprdpdpa)
8. [Implementation Checklist](#implementation-checklist)
9. [Incident Response Plan](#incident-response-plan)

---

## Legal & Compliance Requirements

### 1. Indian GST Law Compliance

#### Rule 138 of CGST Rules, 2017
**E-Way Bill Generation & Validity:**
- E-Way Bill must be generated BEFORE movement of goods
- Information must be accurate and complete
- False information can lead to penalties

**Penalties for Non-Compliance:**
- **₹10,000 OR Tax Amount** (whichever is higher)
- Detention of goods
- Prosecution under Section 122 of CGST Act

#### Digital Signature & Authentication
According to IT Act 2000 & GST Rules:
- All E-Way Bill transactions must be authenticated
- Digital signature/OTP verification required
- Non-repudiation of transactions

### 2. Information Technology Act, 2000

**Section 43A - Data Protection:**
- Organizations must implement reasonable security practices
- Failure to protect sensitive data can result in compensation claims
- E-Way Bill credentials (GSTIN, username, password) are sensitive data

**Section 72A - Punishment for Disclosure:**
- Unauthorized disclosure of personal information
- Imprisonment up to 3 years or fine up to ₹5 lakhs or both

### 3. Digital Personal Data Protection Act (DPDPA) 2023

**Applicable to:**
- Distributor GSTIN
- Transporter details
- User credentials

**Requirements:**
- Purpose limitation
- Data minimization
- Consent (where applicable)
- Right to access and correction
- Breach notification

---

## Data Security Requirements

### 1. Sensitive Data Classification

#### CRITICAL (Highest Security)
```
1. NIC E-Way Bill API Credentials
   - Username
   - Password
   - GSTIN
   - API Keys
   - Session Tokens

2. User Authentication Data
   - Supabase service_role key
   - JWT tokens
   - User passwords (hashed)
```

**Storage Requirements:**
- ✅ **Environment variables** (NOT in code)
- ✅ **Encrypted at rest** (AES-256 or higher)
- ✅ **Encrypted in transit** (TLS 1.3)
- ✅ **Access control** (least privilege)
- ❌ **NEVER commit to Git**
- ❌ **NEVER log in plaintext**

#### HIGH SECURITY
```
1. E-Way Bill Numbers
2. Vehicle Numbers
3. Transporter GSTIN
4. Distributor GSTIN
5. Invoice/Order Details
```

**Storage Requirements:**
- ✅ Database with Row Level Security (RLS)
- ✅ Encrypted backups
- ✅ Audit logging enabled
- ✅ Access controls in place

#### MEDIUM SECURITY
```
1. Order IDs
2. SKU Details
3. Quantities
4. Amounts
```

### 2. Encryption Requirements

#### Data at Rest
```python
# Example: Encrypt E-Way Bill credentials before storing
from cryptography.fernet import Fernet
import os

class EWayBillCredentials:
    def __init__(self):
        # Key should be stored in environment variable
        self.encryption_key = os.getenv('EWAY_BILL_ENCRYPTION_KEY')
        if not self.encryption_key:
            raise ValueError("EWAY_BILL_ENCRYPTION_KEY not set")
        self.cipher = Fernet(self.encryption_key.encode())

    def encrypt_credential(self, credential: str) -> str:
        """Encrypt sensitive credential"""
        return self.cipher.encrypt(credential.encode()).decode()

    def decrypt_credential(self, encrypted: str) -> str:
        """Decrypt sensitive credential"""
        return self.cipher.decrypt(encrypted.encode()).decode()
```

#### Data in Transit
```python
# All E-Way Bill API calls MUST use HTTPS
EWAY_BILL_API_BASE_URL = "https://api.mastergst.com/ewaybillapi/v1.03"

# Verify SSL certificates
import requests

response = requests.post(
    EWAY_BILL_API_BASE_URL + "/ewayapi/genewaybill",
    headers={"Content-Type": "application/json"},
    json=payload,
    verify=True,  # ✅ MUST verify SSL certificates
    timeout=30     # ✅ Set timeout to prevent hanging
)
```

### 3. Credential Management

#### Environment Variables (.env)
```bash
# ❌ WRONG - Never store credentials like this
EWAY_BILL_USERNAME=myusername
EWAY_BILL_PASSWORD=mypassword123

# ✅ CORRECT - Use encrypted secrets or secret management service
EWAY_BILL_USERNAME_ENCRYPTED=gAAAAABh...
EWAY_BILL_PASSWORD_ENCRYPTED=gAAAAABh...
EWAY_BILL_ENCRYPTION_KEY=your-32-byte-key-here

# OR use secret management service
VAULT_URL=https://vault.example.com
VAULT_TOKEN=s.xxxxxx
EWAY_BILL_SECRET_PATH=secret/eway-bill/credentials
```

#### Secret Management (Recommended)
```python
# Option 1: Use HashiCorp Vault
import hvac

client = hvac.Client(url=os.getenv('VAULT_URL'), token=os.getenv('VAULT_TOKEN'))
secrets = client.secrets.kv.v2.read_secret_version(path='eway-bill/credentials')

eway_bill_username = secrets['data']['data']['username']
eway_bill_password = secrets['data']['data']['password']

# Option 2: Use AWS Secrets Manager
import boto3

client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='eway-bill/credentials')
secrets = json.loads(response['SecretString'])

# Option 3: Use Azure Key Vault
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = SecretClient(vault_url=os.getenv('VAULT_URL'), credential=credential)
eway_bill_password = client.get_secret("eway-bill-password").value
```

---

## Authentication & Authorization

### 1. User Permissions

#### Role-Based Access Control (RBAC)
```python
# Define roles with E-Way Bill permissions
class EWayBillPermissions:
    GENERATE = "eway_bill:generate"
    VIEW = "eway_bill:view"
    UPDATE_VEHICLE = "eway_bill:update_vehicle"
    CANCEL = "eway_bill:cancel"

class UserRole:
    PLANT_ADMIN = {
        EWayBillPermissions.GENERATE,
        EWayBillPermissions.VIEW,
        EWayBillPermissions.UPDATE_VEHICLE,
        EWayBillPermissions.CANCEL
    }

    STORE_ADMIN = {
        EWayBillPermissions.VIEW,
        EWayBillPermissions.UPDATE_VEHICLE  # Can only update vehicle
    }

    EXECUTIVE = {
        EWayBillPermissions.VIEW  # Read-only
    }
```

#### Implementation in Backend
```python
# backend/app/api/routes/eway_bill.py

from fastapi import Depends, HTTPException
from app.core.auth import get_current_user, check_permission

@router.post("/generate-order")
async def generate_eway_bill_for_order(
    request: EWayBillGenerateRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    # Check permission
    if not check_permission(current_user, "eway_bill:generate"):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to generate E-Way Bills"
        )

    # Continue with generation...
```

### 2. API Rate Limiting

**NIC E-Way Bill Portal Limits:**
- Maximum 100 requests per minute
- Session timeout: 30 minutes
- Must re-authenticate after timeout

**Implementation:**
```python
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/generate-order")
@limiter.limit("10/minute")  # Max 10 E-Way Bills per minute per user
async def generate_eway_bill_for_order(
    request: Request,
    eway_request: EWayBillGenerateRequest,
    supabase: Client = Depends(get_supabase_admin_client)
):
    # Implementation...
```

### 3. Session Management

```python
class EWayBillSession:
    """Manage NIC E-Way Bill API sessions securely"""

    def __init__(self):
        self.session_token = None
        self.session_expiry = None
        self.max_session_duration = timedelta(minutes=25)  # 5 min before timeout

    def authenticate(self) -> str:
        """Authenticate with NIC API and get session token"""
        credentials = self.get_encrypted_credentials()

        response = requests.post(
            f"{EWAY_BILL_API_BASE_URL}/authenticate",
            json={
                "username": credentials['username'],
                "password": credentials['password']
            },
            verify=True,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            self.session_token = data['authToken']
            self.session_expiry = datetime.utcnow() + self.max_session_duration

            # ✅ DO NOT log the token
            logger.info("E-Way Bill session authenticated successfully")

            return self.session_token
        else:
            logger.error(f"E-Way Bill authentication failed: {response.status_code}")
            raise Exception("Authentication failed")

    def get_valid_token(self) -> str:
        """Get valid session token, re-authenticate if expired"""
        if not self.session_token or datetime.utcnow() >= self.session_expiry:
            return self.authenticate()
        return self.session_token
```

---

## API Security

### 1. Input Validation

**Critical Validations:**
```python
from pydantic import BaseModel, Field, validator
import re

class EWayBillGenerateRequest(BaseModel):
    order_id: str = Field(serialization_alias="orderId")
    vehicle_number: str = Field(serialization_alias="vehicleNumber")
    transporter_id: Optional[str] = Field(default=None, serialization_alias="transporterId")
    transport_mode: TransportMode = Field(serialization_alias="transportMode")
    distance_km: int = Field(serialization_alias="distanceKm", gt=0, lt=10000)

    @validator('vehicle_number')
    def validate_vehicle_number(cls, v):
        """Validate Indian vehicle number format"""
        # Pattern: MH12AB1234
        pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
        if not re.match(pattern, v.upper()):
            raise ValueError('Invalid vehicle number format')
        return v.upper()

    @validator('transporter_id')
    def validate_gstin(cls, v):
        """Validate GSTIN format if provided"""
        if v:
            pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(pattern, v.upper()):
                raise ValueError('Invalid GSTIN format')
        return v.upper() if v else None

    @validator('order_id')
    def validate_order_id(cls, v):
        """Prevent SQL injection in order_id"""
        if not re.match(r'^ORD-[0-9]+$', v):
            raise ValueError('Invalid order ID format')
        return v
```

### 2. SQL Injection Prevention

**✅ Using Parameterized Queries:**
```python
# ✅ CORRECT - Safe from SQL injection
order_response = supabase.table("orders").select("*").eq("id", order_id).single().execute()

# ❌ WRONG - Never concatenate strings
# query = f"SELECT * FROM orders WHERE id = '{order_id}'"
```

### 3. Cross-Site Scripting (XSS) Prevention

**Frontend Input Sanitization:**
```typescript
// services/api/ewayBillService.ts

import DOMPurify from 'dompurify';

export const createEWayBillService = (supabase: SupabaseClient) => ({
    async generateForOrder(request: EWayBillGenerateRequest): Promise<EWayBillResponse> {
        // Sanitize all string inputs
        const sanitizedRequest = {
            ...request,
            vehicleNumber: DOMPurify.sanitize(request.vehicleNumber.toUpperCase()),
            transporterName: request.transporterName
                ? DOMPurify.sanitize(request.transporterName)
                : undefined,
            transporterId: request.transporterId
                ? DOMPurify.sanitize(request.transporterId.toUpperCase())
                : undefined
        };

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/eway-bill/generate-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': crypto.randomUUID() // Track requests
            },
            body: JSON.stringify(sanitizedRequest),
        });

        // ... rest of implementation
    }
});
```

### 4. CORS Configuration

```python
# backend/app/main.py

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",      # Production frontend
        "https://staging.yourdomain.com",  # Staging
        "http://localhost:5173"         # Development only
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=3600,
)
```

### 5. Request/Response Logging

**Secure Logging (WITHOUT sensitive data):**
```python
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class SecureLogger:
    SENSITIVE_FIELDS = {
        'password', 'token', 'authToken', 'session',
        'api_key', 'secret', 'credential'
    }

    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive fields in logs"""
        masked = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in SecureLogger.SENSITIVE_FIELDS):
                masked[key] = "***REDACTED***"
            elif isinstance(value, dict):
                masked[key] = SecureLogger.mask_sensitive_data(value)
            else:
                masked[key] = value
        return masked

    @staticmethod
    def log_api_call(endpoint: str, request_data: Dict[str, Any], response_status: int):
        """Log API calls securely"""
        masked_request = SecureLogger.mask_sensitive_data(request_data)

        logger.info(
            f"E-Way Bill API Call - "
            f"Endpoint: {endpoint}, "
            f"Status: {response_status}, "
            f"Request: {masked_request}"
        )

# Usage
@router.post("/generate-order")
async def generate_eway_bill_for_order(request: EWayBillGenerateRequest):
    try:
        # Generate E-Way Bill...

        # Log securely
        SecureLogger.log_api_call(
            endpoint="/eway-bill/generate-order",
            request_data=request.dict(),
            response_status=200
        )

        return response
    except Exception as e:
        logger.error(f"E-Way Bill generation failed: {str(e)}")
        raise
```

---

## Database Security

### 1. Row Level Security (RLS) Policies

**Supabase RLS for E-Way Bill Data:**
```sql
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only view orders for their portal
CREATE POLICY "Users can view own portal orders"
ON orders FOR SELECT
USING (
  -- Plant Admin can see all orders
  auth.jwt() ->> 'role' = 'Plant Admin'
  OR
  -- Store Admin can see orders for their store's distributors
  (
    auth.jwt() ->> 'role' = 'Store Admin'
    AND distributor_id IN (
      SELECT id FROM distributors
      WHERE store_id = (auth.jwt() ->> 'store_id')::uuid
    )
  )
  OR
  -- Executive can see orders they placed
  (
    auth.jwt() ->> 'role' = 'Executive'
    AND placed_by_exec_id = auth.jwt() ->> 'username'
  )
);

-- Policy 2: Only Plant Admin can generate E-Way Bills
CREATE POLICY "Only Plant Admin can update E-Way Bill"
ON orders FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'Plant Admin'
  AND (
    -- Can only update E-Way Bill fields, not core order data
    eway_bill_number IS NULL  -- Only if not already generated
    OR OLD.eway_bill_number = NEW.eway_bill_number  -- Or vehicle update
  )
);

-- Policy 3: Prevent deletion of orders with E-Way Bills
CREATE POLICY "Cannot delete orders with E-Way Bills"
ON orders FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'Plant Admin'
  AND eway_bill_number IS NULL
);
```

### 2. Database Encryption

**PostgreSQL Encryption at Rest:**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns (if storing credentials in DB - NOT RECOMMENDED)
-- Better to use environment variables or secret management

-- Example: Encrypt transporter credentials if stored
CREATE TABLE transporter_credentials (
    transporter_id TEXT PRIMARY KEY,
    gstin TEXT NOT NULL,
    encrypted_api_key BYTEA,  -- Encrypted using pgcrypto
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Database Backup Security

```bash
#!/bin/bash
# Secure database backup script

# Backup database
pg_dump -h localhost -U postgres -d cms_db \
  --format=custom \
  --no-owner \
  --no-acl \
  > backup_$(date +%Y%m%d_%H%M%S).dump

# Encrypt backup
gpg --symmetric --cipher-algo AES256 \
  --output backup_$(date +%Y%m%d_%H%M%S).dump.gpg \
  backup_$(date +%Y%m%d_%H%M%S).dump

# Delete unencrypted backup
rm backup_$(date +%Y%m%d_%H%M%S).dump

# Upload to secure storage (S3 with encryption)
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).dump.gpg \
  s3://secure-backups/cms/ \
  --sse AES256

# Delete local encrypted backup after upload
rm backup_$(date +%Y%m%d_%H%M%S).dump.gpg
```

---

## Audit Trail Requirements

### 1. E-Way Bill Audit Log Table

```sql
CREATE TABLE eway_bill_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,  -- 'GENERATED', 'UPDATED', 'CANCELLED'
    eway_bill_number TEXT,
    order_id TEXT NOT NULL,
    performed_by TEXT NOT NULL,  -- Username
    performed_by_role TEXT NOT NULL,  -- User role
    ip_address INET,  -- User's IP address
    user_agent TEXT,  -- Browser/client info

    -- Before and after states (for update actions)
    old_values JSONB,
    new_values JSONB,

    -- API response from NIC
    api_request JSONB,
    api_response JSONB,
    api_status_code INT,

    -- Metadata
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,  -- For cancellations or updates

    -- For compliance
    is_successful BOOLEAN NOT NULL,
    error_message TEXT,

    CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Index for fast queries
CREATE INDEX idx_eway_audit_log_order ON eway_bill_audit_log(order_id);
CREATE INDEX idx_eway_audit_log_timestamp ON eway_bill_audit_log(timestamp);
CREATE INDEX idx_eway_audit_log_ewb_number ON eway_bill_audit_log(eway_bill_number);
CREATE INDEX idx_eway_audit_log_performed_by ON eway_bill_audit_log(performed_by);

-- Retention policy: Keep audit logs for 7 years (GST requirement)
CREATE POLICY "Audit logs retained for 7 years"
ON eway_bill_audit_log
USING (timestamp > NOW() - INTERVAL '7 years');
```

### 2. Audit Logging Implementation

```python
# backend/app/services/eway_bill_audit.py

from typing import Dict, Any, Optional
from datetime import datetime
from supabase import Client
import json

class EWayBillAuditLogger:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def log_action(
        self,
        action: str,
        order_id: str,
        performed_by: str,
        performed_by_role: str,
        ip_address: str,
        user_agent: str,
        eway_bill_number: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        api_request: Optional[Dict[str, Any]] = None,
        api_response: Optional[Dict[str, Any]] = None,
        api_status_code: Optional[int] = None,
        reason: Optional[str] = None,
        is_successful: bool = True,
        error_message: Optional[str] = None
    ):
        """Log E-Way Bill action to audit trail"""

        # Mask sensitive data before logging
        if api_request:
            api_request = self._mask_sensitive_fields(api_request)
        if api_response:
            api_response = self._mask_sensitive_fields(api_response)

        audit_entry = {
            "action": action,
            "eway_bill_number": eway_bill_number,
            "order_id": order_id,
            "performed_by": performed_by,
            "performed_by_role": performed_by_role,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "old_values": json.dumps(old_values) if old_values else None,
            "new_values": json.dumps(new_values) if new_values else None,
            "api_request": json.dumps(api_request) if api_request else None,
            "api_response": json.dumps(api_response) if api_response else None,
            "api_status_code": api_status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "reason": reason,
            "is_successful": is_successful,
            "error_message": error_message
        }

        try:
            self.supabase.table("eway_bill_audit_log").insert(audit_entry).execute()
        except Exception as e:
            # Critical: Audit logging failure should not break the flow
            # But must be logged elsewhere
            print(f"CRITICAL: Failed to write audit log: {str(e)}")
            # Consider sending alert to admin

    def _mask_sensitive_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive fields in audit logs"""
        sensitive_fields = {'password', 'token', 'authToken', 'apiKey', 'secret'}
        masked = {}
        for key, value in data.items():
            if key.lower() in sensitive_fields:
                masked[key] = "***REDACTED***"
            elif isinstance(value, dict):
                masked[key] = self._mask_sensitive_fields(value)
            else:
                masked[key] = value
        return masked

# Usage in E-Way Bill generation
@router.post("/generate-order")
async def generate_eway_bill_for_order(
    request: EWayBillGenerateRequest,
    http_request: Request,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    audit_logger = EWayBillAuditLogger(supabase)

    try:
        # Generate E-Way Bill...
        ewb_response = generate_eway_bill_mock(request.order_id, request.distance_km)

        # Log success
        await audit_logger.log_action(
            action="GENERATED",
            order_id=request.order_id,
            performed_by=current_user.username,
            performed_by_role=current_user.role,
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            eway_bill_number=ewb_response["ewayBillNo"],
            api_request=request.dict(),
            api_response=ewb_response,
            api_status_code=200,
            is_successful=True
        )

        return ewb_response

    except Exception as e:
        # Log failure
        await audit_logger.log_action(
            action="GENERATED",
            order_id=request.order_id,
            performed_by=current_user.username,
            performed_by_role=current_user.role,
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            api_request=request.dict(),
            is_successful=False,
            error_message=str(e)
        )
        raise
```

### 3. Audit Log Retention & Compliance

**GST Audit Requirements:**
- Retain all E-Way Bill records for **6 years** minimum (GST Act)
- Maintain audit trail for all modifications
- Provide audit reports to GST authorities on demand

**Implementation:**
```sql
-- Create view for audit reports
CREATE VIEW eway_bill_audit_report AS
SELECT
    a.timestamp,
    a.action,
    a.eway_bill_number,
    a.order_id,
    o.total_amount,
    a.performed_by,
    a.performed_by_role,
    a.is_successful,
    a.error_message,
    a.reason
FROM eway_bill_audit_log a
JOIN orders o ON a.order_id = o.id
WHERE a.timestamp > NOW() - INTERVAL '6 years';

-- Grant read-only access to audit table for compliance team
CREATE ROLE audit_viewer;
GRANT SELECT ON eway_bill_audit_log TO audit_viewer;
GRANT SELECT ON eway_bill_audit_report TO audit_viewer;
```

---

## Data Privacy (GDPR/DPDPA)

### 1. Personal Data Handling

**Personal Data in E-Way Bill:**
- Distributor Name
- Distributor GSTIN
- Distributor Address
- Transporter Name
- Vehicle Number (can be linked to driver)

**Privacy Requirements:**

```python
class EWayBillPrivacyCompliance:
    """Handle privacy requirements for E-Way Bill data"""

    @staticmethod
    def anonymize_for_reports(data: Dict[str, Any]) -> Dict[str, Any]:
        """Anonymize personal data for reports"""
        anonymized = data.copy()

        # Mask GSTIN (show only first 2 and last 2 chars)
        if 'gstin' in anonymized:
            gstin = anonymized['gstin']
            anonymized['gstin'] = f"{gstin[:2]}***********{gstin[-2:]}"

        # Mask vehicle number
        if 'vehicle_number' in anonymized:
            veh = anonymized['vehicle_number']
            anonymized['vehicle_number'] = f"{veh[:4]}****{veh[-2:]}"

        # Partial name
        if 'transporter_name' in anonymized:
            name = anonymized['transporter_name']
            anonymized['transporter_name'] = f"{name[:3]}***"

        return anonymized

    @staticmethod
    def get_data_retention_period() -> int:
        """Get data retention period in days"""
        # GST requirement: 6 years = 2190 days
        return 2190

    @staticmethod
    async def handle_data_deletion_request(
        supabase: Client,
        distributor_id: str
    ):
        """
        Handle Right to Erasure (GDPR/DPDPA)
        Note: Cannot delete if required for legal compliance (GST)
        """
        # Check if any orders are within retention period
        retention_date = datetime.utcnow() - timedelta(days=2190)

        recent_orders = supabase.table("orders") \
            .select("id") \
            .eq("distributor_id", distributor_id) \
            .gte("date", retention_date.isoformat()) \
            .execute()

        if recent_orders.data:
            raise Exception(
                "Cannot delete data: GST compliance requires retention for 6 years. "
                f"Eligible for deletion after {retention_date + timedelta(days=2190)}"
            )

        # If beyond retention period, anonymize instead of delete
        # (for audit trail integrity)
        supabase.table("orders") \
            .update({
                "distributor_id": "ANONYMIZED",
                "vehicle_number": "ANONYMIZED",
                "transporter_name": "ANONYMIZED"
            }) \
            .eq("distributor_id", distributor_id) \
            .execute()
```

### 2. Data Breach Notification

**DPDPA Requirement:**
- Notify Data Protection Board within **72 hours** of breach
- Notify affected individuals if high risk

```python
class DataBreachHandler:
    """Handle data breach detection and notification"""

    @staticmethod
    async def detect_unauthorized_access():
        """Monitor for unauthorized E-Way Bill access"""
        # Check failed login attempts
        failed_logins = await check_failed_login_attempts()

        if failed_logins > 5:
            await DataBreachHandler.trigger_alert(
                severity="HIGH",
                message=f"Multiple failed login attempts detected: {failed_logins}"
            )

    @staticmethod
    async def trigger_alert(severity: str, message: str):
        """Trigger security alert"""
        # Send email to security team
        # Send SMS to admin
        # Log to security monitoring system

        alert = {
            "timestamp": datetime.utcnow().isoformat(),
            "severity": severity,
            "message": message,
            "component": "E-Way Bill System"
        }

        # Send to monitoring system (e.g., Sentry, DataDog)
        logger.critical(f"SECURITY ALERT: {alert}")
```

---

## Implementation Checklist

### Phase 1: Environment Setup (Day 1)
- [ ] Set up secret management (Vault/AWS Secrets Manager/Azure Key Vault)
- [ ] Generate encryption keys for credentials
- [ ] Configure environment variables securely
- [ ] Set up SSL certificates for production
- [ ] Enable HTTPS for all API endpoints

### Phase 2: Database Security (Day 2-3)
- [ ] Create audit log table
- [ ] Enable Row Level Security (RLS) on orders table
- [ ] Create RLS policies for E-Way Bill access
- [ ] Set up encrypted database backups
- [ ] Test backup restoration process

### Phase 3: Backend Security (Day 4-6)
- [ ] Implement input validation for all E-Way Bill fields
- [ ] Add rate limiting for E-Way Bill APIs
- [ ] Implement secure credential storage
- [ ] Add audit logging for all E-Way Bill actions
- [ ] Implement RBAC for E-Way Bill operations
- [ ] Add request/response logging (with masking)
- [ ] Set up error handling and alerting

### Phase 4: API Security (Day 7-8)
- [ ] Configure CORS properly
- [ ] Implement API authentication
- [ ] Add request signing (if using NIC API)
- [ ] Set up SSL certificate pinning
- [ ] Test all security validations

### Phase 5: Frontend Security (Day 9-10)
- [ ] Implement XSS prevention (DOMPurify)
- [ ] Add CSRF protection
- [ ] Sanitize all user inputs
- [ ] Implement secure session management
- [ ] Add client-side input validation

### Phase 6: Compliance (Day 11-12)
- [ ] Implement data retention policies
- [ ] Create privacy policy for E-Way Bill data
- [ ] Set up GDPR/DPDPA compliance checks
- [ ] Create audit report generation
- [ ] Test data deletion/anonymization

### Phase 7: Monitoring & Alerting (Day 13-14)
- [ ] Set up security monitoring
- [ ] Configure breach detection alerts
- [ ] Implement logging aggregation
- [ ] Create security dashboard
- [ ] Test incident response procedures

### Phase 8: Testing (Day 15-17)
- [ ] Penetration testing
- [ ] Security vulnerability scanning
- [ ] Load testing with security checks
- [ ] Test all error scenarios
- [ ] Verify audit logs are complete

### Phase 9: Documentation (Day 18-19)
- [ ] Document security architecture
- [ ] Create runbooks for security incidents
- [ ] Train team on security best practices
- [ ] Create user security guidelines
- [ ] Document compliance procedures

### Phase 10: Production Deployment (Day 20-21)
- [ ] Final security review
- [ ] Deploy to production with monitoring
- [ ] Verify all security measures active
- [ ] Test in production (read-only first)
- [ ] Monitor for 48 hours

---

## Incident Response Plan

### Severity Levels

#### CRITICAL (P0)
- Unauthorized access to E-Way Bill credentials
- Data breach exposing customer GSTIN/personal data
- Complete system compromise

**Response Time:** Immediate (< 15 minutes)

#### HIGH (P1)
- Multiple failed authentication attempts
- Suspicious API access patterns
- Potential SQL injection attempts

**Response Time:** < 1 hour

#### MEDIUM (P2)
- Unusual access patterns
- Permission violations
- Rate limit violations

**Response Time:** < 4 hours

#### LOW (P3)
- General security warnings
- Minor configuration issues

**Response Time:** < 24 hours

### Incident Response Procedure

```
1. DETECT
   └── Automated monitoring detects anomaly
   └── Alert sent to security team

2. ASSESS
   └── Determine severity level
   └── Identify affected systems/data
   └── Estimate impact

3. CONTAIN
   └── Isolate affected systems
   └── Revoke compromised credentials
   └── Block malicious IPs
   └── Enable additional logging

4. INVESTIGATE
   └── Review audit logs
   └── Identify root cause
   └── Determine extent of breach
   └── Collect evidence

5. REMEDIATE
   └── Patch vulnerabilities
   └── Restore from clean backups
   └── Update security measures
   └── Reset credentials

6. NOTIFY
   └── Notify Data Protection Board (if required)
   └── Notify affected users (if required)
   └── Notify management
   └── Document incident

7. REVIEW
   └── Post-mortem analysis
   └── Update security measures
   └── Update incident response plan
   └── Train team on lessons learned
```

### Emergency Contacts

```
Security Team Lead: [Phone] [Email]
CTO/Technical Lead: [Phone] [Email]
Legal Counsel: [Phone] [Email]
NIC E-Way Bill Support: 0120-4888999
Cyber Crime Cell: 1930
```

---

## Best Practices Summary

### DO ✅

1. **Encrypt Everything**
   - Credentials at rest
   - Data in transit (TLS 1.3)
   - Database backups
   - Audit logs

2. **Implement Defense in Depth**
   - Multiple layers of security
   - Fail securely (deny by default)
   - Principle of least privilege
   - Separation of duties

3. **Monitor & Audit**
   - Log all E-Way Bill actions
   - Monitor for anomalies
   - Regular security audits
   - Automated vulnerability scanning

4. **Keep Updated**
   - Regular security patches
   - Update dependencies
   - Monitor security advisories
   - Review security policies quarterly

5. **Train Users**
   - Security awareness training
   - Phishing simulation
   - Incident response drills
   - Secure password practices

### DON'T ❌

1. **Never Store Plaintext Credentials**
   - Not in code
   - Not in Git
   - Not in logs
   - Not in databases

2. **Never Trust User Input**
   - Always validate
   - Always sanitize
   - Use parameterized queries
   - Implement rate limiting

3. **Never Ignore Security Warnings**
   - Fix vulnerabilities promptly
   - Don't disable security features
   - Don't skip security updates
   - Don't ignore audit logs

4. **Never Expose Sensitive Data**
   - In error messages
   - In URLs
   - In logs
   - In API responses

5. **Never Skip Testing**
   - Security testing is mandatory
   - Test all edge cases
   - Test failure scenarios
   - Test with malicious input

---

## Security Checklist for Go-Live

### Pre-Production Security Review

- [ ] All credentials stored securely (not in code/Git)
- [ ] Environment variables configured correctly
- [ ] Database RLS policies enabled and tested
- [ ] Audit logging working correctly
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured properly (production domains only)
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive info
- [ ] Backup and restore tested
- [ ] Incident response plan documented
- [ ] Security monitoring configured
- [ ] Penetration testing completed
- [ ] Vulnerability scan passed
- [ ] Team trained on security procedures
- [ ] Compliance requirements met (GST/GDPR/DPDPA)

### Post-Production Monitoring (First Week)

- [ ] Monitor authentication failures
- [ ] Check audit logs daily
- [ ] Review API access patterns
- [ ] Monitor error rates
- [ ] Check rate limiting effectiveness
- [ ] Verify backup completion
- [ ] Test alert notifications
- [ ] Review security dashboard
- [ ] Check SSL certificate validity
- [ ] Verify CORS working correctly

---

## Conclusion

**Key Takeaways:**

1. **Legal Compliance is Critical**
   - GST penalties are severe
   - DPDPA violations have legal consequences
   - Audit trail is mandatory for 6+ years

2. **Security is Not Optional**
   - Credentials must be encrypted
   - Audit everything
   - Monitor continuously
   - Respond quickly to incidents

3. **Privacy Matters**
   - Handle personal data carefully
   - Implement retention policies
   - Support data subject rights
   - Anonymize when possible

4. **Defense in Depth**
   - Multiple security layers
   - Fail securely
   - Least privilege
   - Continuous monitoring

**Remember:** Security is an ongoing process, not a one-time implementation. Regular reviews, updates, and training are essential.

---

**Document Classification:** CONFIDENTIAL
**Last Updated:** 2025-11-20
**Review Schedule:** Quarterly
**Owner:** Security Team
**Approved By:** [To be filled]
