'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, ProcurementMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { ProcurementDashboard } from '@/components/procurement/ProcurementDashboard';
import { PurchaseOrdersTable } from '@/components/procurement/PurchaseOrdersTable';
import { CreatePurchaseOrderModal } from '@/components/procurement/CreatePurchaseOrderModal';
import { PurchaseOrderDetailDrawer } from '@/components/procurement/PurchaseOrderDetailDrawer';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, PlusCircle, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Accountant', 'Administrator']);
  const canReceive = hasRole(['Workshop Supervisor', 'Fleet Manager', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [metrics, setMetrics] = useState<ProcurementMetrics>({
    totalSpend: 0,
    openOrdersCount: 0,
    pendingReceiptsCount: 0,
    outstandingPayables: 0,
    activeSuppliersCount: 0,
  });

  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ itemCode: string; itemName: string; uom: string; rate: number }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);
  const [breakdowns, setBreakdowns] = useState<Array<{
    id: string;
    vehicle: string;
    description: string;
    parts: Array<{ itemCode: string; plannedQty: number }>;
  }>>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Load options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/inventory/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.suppliers) setSuppliers(json.suppliers);
          if (json.items) setItems(json.items);
          if (json.warehouses) setWarehouses(json.warehouses);
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.breakdowns) setBreakdowns(json.breakdowns);
        }
      } catch (err) {
        console.warn('Could not load procurement options:', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch purchase orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedSupplier !== 'ALL') params.set('supplier', selectedSupplier);

      const res = await fetch(`/api/procurement/orders?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load purchase orders');
      }

      setOrders(json.orders || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err: any) {
      setError(err.message || 'Error communicating with ERPNext');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedSupplier]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Submit / Approve PO
  const handleSubmitOrder = async (order: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to approve and submit Purchase Order '${order.name}'?`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/procurement/orders/${encodeURIComponent(order.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve purchase order');
      }

      setSuccessMessage(`Purchase Order '${order.name}' submitted successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadOrders();
      if (selectedOrderId === order.name) {
        setSelectedOrderId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting purchase order');
    }
  };

  // Receive Goods (Create Purchase Receipt against PO)
  const handleReceiveGoods = async (order: PurchaseOrder) => {
    if (!confirm(`Create Purchase Receipt and receive items for PO '${order.name}' into warehouse?`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch('/api/procurement/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrder: order.name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive goods in ERPNext');
      }

      setSuccessMessage(`Goods received for '${order.name}' under Receipt '${data.receipt?.name || ''}'. Inventory updated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadOrders();
      if (selectedOrderId === order.name) {
        setSelectedOrderId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating goods receipt');
    }
  };

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Purchase Orders & Procurement
              </h1>
              <p className="text-sm text-slate-500">
                Procurement lifecycle, approval gating, and goods receipt tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOrders()}
              disabled={isLoading}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </Button>
            )}
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Procurement Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Procurement Dashboard Cards */}
        <ProcurementDashboard metrics={metrics} isLoading={isLoading} />

        {/* Purchase Orders Table */}
        <PurchaseOrdersTable
          orders={orders}
          isLoading={isLoading}
          suppliers={suppliers}
          vehicles={vehicles}
          onSelectOrder={(o) => setSelectedOrderId(o.name)}
          onSubmitOrder={handleSubmitOrder}
          onReceiveGoods={handleReceiveGoods}
          canManage={canManage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedSupplier={selectedSupplier}
          onSupplierChange={setSelectedSupplier}
        />

        {/* Create PO Modal */}
        {isCreateModalOpen && (
          <CreatePurchaseOrderModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              setSuccessMessage('Purchase Order created in Draft.');
              setTimeout(() => setSuccessMessage(null), 4000);
              loadOrders();
            }}
            suppliers={suppliers}
            items={items}
            warehouses={warehouses}
            vehicles={vehicles}
            breakdowns={breakdowns}
          />
        )}

        {/* Purchase Order Details Slide-Over */}
        {selectedOrderId && (
          <PurchaseOrderDetailDrawer
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
            onSubmitOrder={handleSubmitOrder}
            onReceiveGoods={handleReceiveGoods}
            canManage={canManage}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

