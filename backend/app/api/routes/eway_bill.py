from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.models.orders import Order
from app.models.eway_bill import EWayBillGenerateRequest, EWayBillUpdateVehicleRequest, EWayBillResponse, TransportMode
from app.core.supabase import get_supabase_admin_client
from supabase import Client
from datetime import datetime, timedelta

router = APIRouter(prefix="/eway-bill", tags=["E-Way Bill"])

# Constants
EWAY_BILL_THRESHOLD = 50000  # ₹50,000
VALIDITY_PER_100KM = 1  # 1 day per 100 km

def calculate_validity_days(distance_km: int) -> int:
    """Calculate E-Way Bill validity period based on distance"""
    # Rule: 1 day for every 100 km or part thereof
    return max(1, (distance_km // 100) + (1 if distance_km % 100 > 0 else 0))

def generate_eway_bill_mock(distance_km: int) -> dict:
    """
    Mock E-Way Bill generation
    Replace this with actual NIC API integration
    """
    # Generate mock E-Way Bill number
    timestamp = int(datetime.utcnow().timestamp() * 1000)
    ewb_number = f"351{timestamp}" # Mock format similar to real ones
    
    # Calculate validity
    validity_days = calculate_validity_days(distance_km)
    generated_date = datetime.utcnow()
    valid_until = generated_date + timedelta(days=validity_days)
    
    return {
        "ewayBillNo": ewb_number,
        "ewbDate": generated_date.isoformat(),
        "validUpto": valid_until.isoformat(),
        "alert": "MOCK: This is a test E-Way Bill. Integrate with NIC API for production."
    }

@router.post("/generate-order", response_model=EWayBillResponse)
async def generate_eway_bill_for_order(
    request: EWayBillGenerateRequest,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Generate E-Way Bill for an order
    Requirements:
    - Order total >= ₹50,000
    - Order status must be Pending (not yet delivered)
    - E-Way Bill not already generated
    """
    try:
        # Fetch order details
        order_response = supabase.table("orders").select("*").eq("id", request.order_id).single().execute()
        
        if not order_response.data:
            raise HTTPException(status_code=404, detail="Order not found")
            
        order = order_response.data
        
        # Validation 1: Check if order value meets threshold
        if order["total_amount"] < EWAY_BILL_THRESHOLD:
            raise HTTPException(
                status_code=400, 
                detail=f"E-Way Bill not required. Order value {order['total_amount']} is below threshold of {EWAY_BILL_THRESHOLD}"
            )
            
        # Validation 2: Check if already generated
        if order.get("eway_bill_number"):
            raise HTTPException(
                status_code=400, 
                detail=f"E-Way Bill already generated: {order['eway_bill_number']}"
            )
            
        # Validation 3: Check order status
        if order["status"] == "Delivered":
            raise HTTPException(
                status_code=400, 
                detail="Cannot generate E-Way Bill for delivered order"
            )
            
        # Mock Generation
        ewb_response = generate_eway_bill_mock(request.distance_km)
        
        # Update order with E-Way Bill details
        update_data = {
            "eway_bill_number": ewb_response["ewayBillNo"],
            "eway_bill_date": ewb_response["ewbDate"],
            "eway_bill_valid_until": ewb_response["validUpto"],
            "vehicle_number": request.vehicle_number,
            "transporter_id": request.transporter_id,
            "transporter_name": request.transporter_name,
            "transport_mode": request.transport_mode.value,
            "distance_km": request.distance_km,
            "supply_type": "Outward"
        }
        
        supabase.table("orders").update(update_data).eq("id", request.order_id).execute()
        
        return EWayBillResponse(
            ewayBillNumber=ewb_response["ewayBillNo"],
            ewayBillDate=ewb_response["ewbDate"],
            validUntil=ewb_response["validUpto"],
            status="Generated",
            alert=ewb_response.get("alert")
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating E-Way Bill: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{eway_bill_number}/vehicle", response_model=EWayBillResponse)
async def update_eway_bill_vehicle(
    eway_bill_number: str,
    request: EWayBillUpdateVehicleRequest,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Update Part B (vehicle details) of E-Way Bill
    Can only be done before goods are in transit
    """
    try:
        # Find order with this E-Way Bill
        order_response = supabase.table("orders").select("*").eq("eway_bill_number", eway_bill_number).single().execute()
        
        if not order_response.data:
            raise HTTPException(status_code=404, detail="E-Way Bill not found")
            
        order = order_response.data
        
        # Validation: Cannot update if already delivered
        if order["status"] == "Delivered":
            raise HTTPException(
                status_code=400, 
                detail="Cannot update vehicle details for delivered order"
            )
            
        # Update database
        update_data = {
            "vehicle_number": request.vehicle_number,
            "transporter_id": request.transporter_id,
            "transporter_name": request.transporter_name,
            "transport_mode": request.transport_mode.value
        }
        
        supabase.table("orders").update(update_data).eq("eway_bill_number", eway_bill_number).execute()
        
        return EWayBillResponse(
            ewayBillNumber=eway_bill_number,
            ewayBillDate=order["eway_bill_date"],
            validUntil=order["eway_bill_valid_until"],
            status="Updated",
            alert="Vehicle details updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{eway_bill_number}/cancel")
async def cancel_eway_bill(
    eway_bill_number: str,
    reason: str,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Cancel E-Way Bill
    """
    try:
        # Find order with this E-Way Bill
        order_response = supabase.table("orders").select("*").eq("eway_bill_number", eway_bill_number).single().execute()
        
        if not order_response.data:
            raise HTTPException(status_code=404, detail="E-Way Bill not found")
            
        order = order_response.data
        
        if order["status"] == "Delivered":
            raise HTTPException(
                status_code=400, 
                detail="Cannot cancel E-Way Bill for delivered order"
            )
            
        # Clear from database
        update_data = {
            "eway_bill_number": None,
            "eway_bill_date": None,
            "eway_bill_valid_until": None
        }
        
        supabase.table("orders").update(update_data).eq("eway_bill_number", eway_bill_number).execute()
        
        return {
            "message": "E-Way Bill cancelled successfully",
            "ewayBillNumber": eway_bill_number,
            "reason": reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/order/{order_id}")
async def get_order_eway_bill(
    order_id: str,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Get E-Way Bill details for an order"""
    try:
        order_response = supabase.table("orders").select("*").eq("id", order_id).single().execute()
        
        if not order_response.data:
            raise HTTPException(status_code=404, detail="Order not found")
            
        order = order_response.data
        
        if not order.get("eway_bill_number"):
            return {
                "hasEwayBill": False,
                "message": "No E-Way Bill generated for this order"
            }
            
        return {
            "hasEwayBill": True,
            "ewayBillNumber": order["eway_bill_number"],
            "ewayBillDate": order["eway_bill_date"],
            "validUntil": order["eway_bill_valid_until"],
            "vehicleNumber": order["vehicle_number"],
            "transporterName": order["transporter_name"],
            "transportMode": order["transport_mode"],
            "distanceKm": order["distance_km"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
