import * as XLSX from 'xlsx';

/**
 * Export data to an Excel file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the worksheet
 */
export function exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    filename: string,
    sheetName: string = 'Sheet1'
): void {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns based on content
    const columnWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(
            key.length,
            ...data.map(row => String(row[key] ?? '').length)
        ) + 2
    }));
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate and download file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Format order data for export
 */
export function formatOrdersForExport(orders: any[]) {
    return orders.map(order => ({
        'Order ID': order.id,
        'Date': new Date(order.date).toLocaleDateString('en-IN'),
        'Distributor': order.distributor?.name || order.distributorId,
        'Status': order.status,
        'Total Amount': order.totalAmount,
        'Placed By': order.placedByExecId,
        'Delivered Date': order.deliveredDate
            ? new Date(order.deliveredDate).toLocaleDateString('en-IN')
            : '-'
    }));
}

/**
 * Format distributor data for export
 */
export function formatDistributorsForExport(distributors: any[]) {
    return distributors.map(d => ({
        'Agent Code': d.agentCode || d.agent_code,
        'Name': d.name,
        'Phone': d.phone,
        'State': d.state,
        'Area': d.area,
        'Wallet Balance': d.walletBalance || d.wallet_balance,
        'Credit Limit': d.creditLimit || d.credit_limit,
        'ASM': d.asmName || d.asm_name,
        'Executive': d.executiveName || d.executive_name,
        'Date Added': d.dateAdded || d.date_added
            ? new Date(d.dateAdded || d.date_added).toLocaleDateString('en-IN')
            : '-'
    }));
}

/**
 * Format audit logs for export
 */
export function formatAuditLogsForExport(logs: any[]) {
    return logs.map(log => ({
        'Timestamp': new Date(log.timestamp).toLocaleString('en-IN'),
        'Action': log.action,
        'Entity Type': log.entity_type,
        'Entity ID': log.entity_id,
        'User': log.username || 'System',
        'Details': log.details || '-'
    }));
}

/**
 * Format wallet transactions for export
 */
export function formatTransactionsForExport(transactions: any[]) {
    return transactions.map(t => ({
        'Date': new Date(t.date).toLocaleDateString('en-IN'),
        'Type': t.type,
        'Amount': t.amount,
        'Balance After': t.balanceAfter || t.balance_after,
        'Order ID': t.orderId || t.order_id || '-',
        'Payment Method': t.paymentMethod || t.payment_method || '-',
        'Remarks': t.remarks || '-',
        'Initiated By': t.initiatedBy || t.initiated_by || '-'
    }));
}
