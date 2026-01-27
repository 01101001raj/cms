from app.core.supabase import get_supabase_admin_client
from datetime import datetime
from typing import Optional, Any
import json


class AuditLogger:
    """
    Service for logging audit events to the audit_logs table.
    All key operations should be logged for compliance and dispute resolution.
    """
    
    @staticmethod
    async def log(
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: str,
        username: str,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        details: Optional[str] = None
    ):
        """
        Log an audit event.
        
        Args:
            action: The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
            entity_type: Type of entity (e.g., 'ORDER', 'USER', 'DISTRIBUTOR')
            entity_id: ID of the affected entity
            user_id: ID of the user who performed the action
            username: Username/email of the user
            old_value: Previous value (for updates/deletes)
            new_value: New value (for creates/updates)
            details: Additional details or notes
        """
        try:
            supabase = get_supabase_admin_client()
            
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "user_id": user_id,
                "username": username,
                "old_value": json.dumps(old_value) if old_value else None,
                "new_value": json.dumps(new_value) if new_value else None,
                "details": details
            }
            
            supabase.table("audit_logs").insert(log_entry).execute()
            
        except Exception as e:
            # Don't fail the main operation if audit logging fails
            print(f"[AUDIT ERROR] Failed to log audit event: {e}")


# Convenience functions for common actions
async def log_order_created(order_id: str, user_id: str, username: str, order_data: dict):
    await AuditLogger.log(
        action="CREATE",
        entity_type="ORDER",
        entity_id=order_id,
        user_id=user_id,
        username=username,
        new_value=order_data,
        details=f"Order placed for distributor {order_data.get('distributor_id')}"
    )


async def log_order_delivered(order_id: str, user_id: str, username: str):
    await AuditLogger.log(
        action="UPDATE",
        entity_type="ORDER",
        entity_id=order_id,
        user_id=user_id,
        username=username,
        details="Order marked as delivered"
    )


async def log_order_deleted(order_id: str, user_id: str, username: str, remarks: str):
    await AuditLogger.log(
        action="DELETE",
        entity_type="ORDER",
        entity_id=order_id,
        user_id=user_id,
        username=username,
        details=f"Order deleted. Reason: {remarks}"
    )


async def log_user_created(new_user_id: str, admin_id: str, admin_username: str, user_data: dict):
    await AuditLogger.log(
        action="CREATE",
        entity_type="USER",
        entity_id=new_user_id,
        user_id=admin_id,
        username=admin_username,
        new_value={"username": user_data.get("username"), "role": user_data.get("role")},
        details=f"New user created with role {user_data.get('role')}"
    )


async def log_user_updated(user_id: str, admin_id: str, admin_username: str, changes: dict):
    await AuditLogger.log(
        action="UPDATE",
        entity_type="USER",
        entity_id=user_id,
        user_id=admin_id,
        username=admin_username,
        new_value=changes,
        details="User profile updated"
    )


async def log_user_deleted(deleted_user_id: str, admin_id: str, admin_username: str, deleted_username: str):
    await AuditLogger.log(
        action="DELETE",
        entity_type="USER",
        entity_id=deleted_user_id,
        user_id=admin_id,
        username=admin_username,
        details=f"User {deleted_username} deleted"
    )


async def log_wallet_recharge(distributor_id: str, user_id: str, username: str, amount: float, new_balance: float):
    await AuditLogger.log(
        action="RECHARGE",
        entity_type="WALLET",
        entity_id=distributor_id,
        user_id=user_id,
        username=username,
        new_value={"amount": amount, "new_balance": new_balance},
        details=f"Wallet recharged by {amount}"
    )


async def log_distributor_created(distributor_id: str, user_id: str, username: str, distributor_name: str):
    await AuditLogger.log(
        action="CREATE",
        entity_type="DISTRIBUTOR",
        entity_id=distributor_id,
        user_id=user_id,
        username=username,
        details=f"Distributor {distributor_name} onboarded"
    )


async def log_distributor_updated(distributor_id: str, user_id: str, username: str, distributor_name: str, changes: dict = None):
    await AuditLogger.log(
        action="UPDATE",
        entity_type="DISTRIBUTOR",
        entity_id=distributor_id,
        user_id=user_id,
        username=username,
        new_value=changes,
        details=f"Distributor {distributor_name} updated"
    )


async def log_distributor_deleted(distributor_id: str, user_id: str, username: str, distributor_name: str):
    await AuditLogger.log(
        action="DELETE",
        entity_type="DISTRIBUTOR",
        entity_id=distributor_id,
        user_id=user_id,
        username=username,
        details=f"Distributor {distributor_name} deleted"
    )


async def log_return_initiated(return_id: str, order_id: str, user_id: str, username: str, amount: float):
    await AuditLogger.log(
        action="CREATE",
        entity_type="RETURN",
        entity_id=return_id,
        user_id=user_id,
        username=username,
        new_value={"order_id": order_id, "amount": amount},
        details=f"Return initiated for order {order_id}"
    )


async def log_return_confirmed(return_id: str, user_id: str, username: str, amount: float):
    await AuditLogger.log(
        action="CONFIRM",
        entity_type="RETURN",
        entity_id=return_id,
        user_id=user_id,
        username=username,
        details=f"Return confirmed, credit amount: {amount}"
    )


async def log_stock_production(sku_id: str, user_id: str, username: str, quantity: int, location: str):
    await AuditLogger.log(
        action="PRODUCTION",
        entity_type="STOCK",
        entity_id=sku_id,
        user_id=user_id,
        username=username,
        new_value={"quantity": quantity, "location": location},
        details=f"Production of {quantity} units at {location}"
    )


async def log_stock_adjustment(sku_id: str, user_id: str, username: str, quantity: int, reason: str):
    await AuditLogger.log(
        action="ADJUSTMENT",
        entity_type="STOCK",
        entity_id=sku_id,
        user_id=user_id,
        username=username,
        new_value={"quantity": quantity},
        details=f"Stock adjusted: {reason}"
    )


async def log_transfer_created(transfer_id: str, user_id: str, username: str, destination: str, total_value: float):
    await AuditLogger.log(
        action="CREATE",
        entity_type="TRANSFER",
        entity_id=transfer_id,
        user_id=user_id,
        username=username,
        new_value={"destination": destination, "value": total_value},
        details=f"Transfer created to {destination}"
    )


async def log_transfer_delivered(transfer_id: str, user_id: str, username: str):
    await AuditLogger.log(
        action="DELIVER",
        entity_type="TRANSFER",
        entity_id=transfer_id,
        user_id=user_id,
        username=username,
        details="Transfer marked as delivered"
    )


async def log_scheme_created(scheme_id: str, user_id: str, username: str, description: str):
    await AuditLogger.log(
        action="CREATE",
        entity_type="SCHEME",
        entity_id=scheme_id,
        user_id=user_id,
        username=username,
        details=f"Scheme created: {description}"
    )


async def log_scheme_stopped(scheme_id: str, user_id: str, username: str, description: str):
    await AuditLogger.log(
        action="STOP",
        entity_type="SCHEME",
        entity_id=scheme_id,
        user_id=user_id,
        username=username,
        details=f"Scheme stopped: {description}"
    )


async def log_product_created(product_id: str, user_id: str, username: str, product_name: str):
    await AuditLogger.log(
        action="CREATE",
        entity_type="PRODUCT",
        entity_id=product_id,
        user_id=user_id,
        username=username,
        details=f"Product created: {product_name}"
    )


async def log_product_updated(product_id: str, user_id: str, username: str, product_name: str):
    await AuditLogger.log(
        action="UPDATE",
        entity_type="PRODUCT",
        entity_id=product_id,
        user_id=user_id,
        username=username,
        details=f"Product updated: {product_name}"
    )


async def log_store_created(store_id: str, user_id: str, username: str, store_name: str):
    await AuditLogger.log(
        action="CREATE",
        entity_type="STORE",
        entity_id=store_id,
        user_id=user_id,
        username=username,
        details=f"Store created: {store_name}"
    )


async def log_store_updated(store_id: str, user_id: str, username: str, store_name: str):
    await AuditLogger.log(
        action="UPDATE",
        entity_type="STORE",
        entity_id=store_id,
        user_id=user_id,
        username=username,
        details=f"Store updated: {store_name}"
    )

