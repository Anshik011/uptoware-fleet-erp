// ============================================================================
// UPTOWARE FLEET ERP - LOCAL DEMO DISPATCHER
// Intercepts and fulfills Frappe API requests using the local sandbox store
// when running locally (localhost:3001) in LOCAL_DEMO_MODE.
// ============================================================================

import { localStore } from './localStore';

export async function handleLocalDemoRequest(endpoint: string, options: any = {}): Promise<any> {
  const store = localStore.get();
  const method = (options.method || 'GET').toUpperCase();
  const decoded = decodeURIComponent(endpoint);
  let body: any = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  // 1. Vehicles
  if (decoded.includes('/api/resource/Vehicle')) {
    const parts = decoded.split('/api/resource/Vehicle');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.vehicles.find((v) => v.id === id || v.licensePlate === id) || store.vehicles[0];
      return { data: found };
    }
    if (method === 'POST') {
      const newV = {
        id: body.license_plate || `OD-35-LOCAL-${Date.now().toString().slice(-4)}`,
        licensePlate: body.license_plate,
        make: body.make || 'Tata Motors',
        model: body.model || 'Prima',
        status: body.vehicle_status || 'Active',
        assignedDriverId: body.assigned_driver || null,
        assignedDriverName: null,
        payloadCapacityTons: Number(body.payload_capacity_tons || 35),
        lastOdometer: Number(body.last_odometer || 0),
        fuelType: body.fuel_type || 'Diesel',
        customTransportType: body.custom_transport_type || 'Transport',
        customVehicleType: body.custom_vehicle_type || 'Mining Tipper',
      };
      store.vehicles.push(newV);
      localStore.save(store);
      return { data: newV };
    }
    if (id && method === 'PUT') {
      const idx = store.vehicles.findIndex((v) => v.id === id || v.licensePlate === id);
      if (idx !== -1) {
        store.vehicles[idx] = { ...store.vehicles[idx], ...body };
        localStore.save(store);
        return { data: store.vehicles[idx] };
      }
    }
    return { data: store.vehicles };
  }

  // 2. Employees
  if (decoded.includes('/api/resource/Employee') || decoded.includes('doctype=Employee')) {
    const parts = decoded.split('/api/resource/Employee');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.employees.find((e) => e.id === id) || store.employees[0];
      return { data: found };
    }
    if (method === 'POST') {
      const newEmp = {
        id: `HR-EMP-LOCAL-${Date.now().toString().slice(-4)}`,
        employeeName: `${body.first_name || ''} ${body.last_name || ''}`.trim() || 'New Employee',
        designation: body.designation || 'Staff',
        status: 'Active',
        dailySalary: Number(body.custom_daily_salary_rate || 800),
        department: body.department || 'Mining Operations',
      };
      store.employees.push(newEmp);
      localStore.save(store);
      return { data: newEmp };
    }
    return { data: store.employees };
  }

  // 3. Drivers
  if (decoded.includes('/api/resource/Driver') || decoded.includes('doctype=Driver')) {
    const parts = decoded.split('/api/resource/Driver');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.drivers.find((d) => d.id === id || d.name === id) || store.drivers[0];
      return { data: found };
    }
    if (method === 'POST') {
      const newD = {
        id: `DRV-LOCAL-${Date.now().toString().slice(-4)}`,
        name: `DRV-LOCAL-${Date.now().toString().slice(-4)}`,
        fullName: body.full_name,
        status: 'Active',
        cellNumber: body.cell_number || null,
        licenseNumber: body.license_number || null,
        assignedVehicle: body.assigned_vehicle || null,
        safetyScore: 95,
      };
      store.drivers.push(newD);
      localStore.save(store);
      return { data: newD };
    }
    return { data: store.drivers };
  }

  // 4. Mine Sites
  if (decoded.includes('Mine Site') || decoded.includes('Mine%20Site')) {
    return { data: store.mineSites };
  }

  // 5. Fleet Leads
  if (decoded.includes('Fleet Lead') || decoded.includes('Fleet%20Lead')) {
    return { data: store.leads };
  }

  // 6. Mining Trips
  if (decoded.includes('Mining Trip') || decoded.includes('Mining%20Trip')) {
    const parts = decoded.split('/api/resource/Mining Trip');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.trips.find((t) => t.id === id || t.name === id) || store.trips[0];
      return { data: found };
    }
    if (method === 'POST') {
      const count = Number(body.custom_trip_count || 1);
      const avg = Number(body.custom_average_tonnage || 35);
      const rate = Number(body.custom_lead_rate || body.rate_per_ton || 120);
      const newTrip = {
        id: `TRIP-LOCAL-${Date.now().toString().slice(-4)}`,
        name: `TRIP-LOCAL-${Date.now().toString().slice(-4)}`,
        vehicle: body.vehicle,
        driver: body.driver || 'DRV-LOCAL-001',
        mineSite: body.mine_site || store.mineSites[0].id,
        destination: body.destination || 'CHP Siding',
        materialType: body.material_type || 'Coal',
        dispatchDateTime: body.dispatch_date_time || new Date().toISOString(),
        shift: body.custom_shift || 'Shift A',
        tripCount: count,
        averageTonnage: avg,
        lead: body.custom_lead || 'CHP',
        leadKm: body.custom_lead_km || 4,
        leadRate: rate,
        calculatedQuantity: count * avg,
        calculatedAmount: count * avg * rate,
        tripStatus: 'Approved',
        workflowState: 'Approved',
        status: 'Approved',
      };
      store.trips.unshift(newTrip);
      localStore.save(store);
      return { data: newTrip };
    }
    if (id && method === 'PUT') {
      const idx = store.trips.findIndex((t) => t.id === id || t.name === id);
      if (idx !== -1) {
        store.trips[idx] = { ...store.trips[idx], ...body };
        localStore.save(store);
        return { data: store.trips[idx] };
      }
    }
    return { data: store.trips };
  }

  // 7. Attendance
  if (decoded.includes('Employee Attendance') || decoded.includes('Employee%20Attendance')) {
    if (method === 'POST') {
      const newAtt = {
        name: `ATT-LOCAL-${Date.now().toString().slice(-4)}`,
        employee: body.employee,
        employee_name: body.employee_name || 'Jisu Nayak',
        attendance_date: body.attendance_date,
        attendance_status: body.attendance_status || 'Present',
        shift: body.shift || 'Shift A',
        mine_site: body.mine_site || store.mineSites[0].id,
        daily_salary_rate: Number(body.daily_salary_rate || 850),
        calculated_salary_amount: Number(body.calculated_salary_amount || 850),
      };
      store.attendance.unshift(newAtt);
      localStore.save(store);
      return { data: newAtt };
    }
    return { data: store.attendance, message: store.attendance };
  }

  // 8. Fuel Logs
  if (decoded.includes('Fuel Log') || decoded.includes('Fuel%20Log')) {
    if (method === 'POST') {
      const newFuel = {
        id: Date.now(),
        vehicle: body.vehicle,
        driver: body.driver,
        mineSite: body.mine_site,
        date: body.date,
        fuelLiters: Number(body.fuel_liters),
        costPerLiter: Number(body.cost_per_liter),
        totalCost: Number(body.fuel_liters) * Number(body.cost_per_liter),
        odometerReading: Number(body.odometer_reading),
        approvalStatus: 'Approved',
      };
      store.fuelLogs.unshift(newFuel);
      localStore.save(store);
      return { data: newFuel };
    }
    return { data: store.fuelLogs };
  }

  // 9. Items / Spare Parts
  if (decoded.includes('/api/resource/Item') || decoded.includes('doctype=Item')) {
    if (method === 'POST') {
      const newItem = {
        id: body.item_code || `SP-LOCAL-${Date.now().toString().slice(-4)}`,
        name: body.item_name || 'New Spare Part',
        itemName: body.item_name,
        itemGroup: body.item_group || 'General Spares',
        stockUom: body.stock_uom || 'Nos',
        standardRate: Number(body.standard_rate || 100),
        currentStock: 10,
      };
      store.items.push(newItem);
      localStore.save(store);
      return { data: newItem };
    }
    return { data: store.items };
  }

  // 10. Purchase Orders
  if (decoded.includes('Purchase Order') || decoded.includes('Purchase%20Order')) {
    if (method === 'POST') {
      const newPO = {
        id: `PUR-ORD-LOCAL-${Date.now().toString().slice(-4)}`,
        name: `PUR-ORD-LOCAL-${Date.now().toString().slice(-4)}`,
        supplier: body.supplier || 'Talcher Auto Spares',
        transactionDate: body.transaction_date,
        grandTotal: Number(body.grand_total || 15000),
        status: 'Submitted',
        customVehicle: body.custom_vehicle || null,
        items: body.items || [],
      };
      store.purchaseOrders.unshift(newPO);
      localStore.save(store);
      return { data: newPO };
    }
    return { data: store.purchaseOrders };
  }

  // 11. Breakdowns
  if (decoded.includes('Vehicle Breakdown') || decoded.includes('Vehicle%20Breakdown')) {
    return { data: store.breakdowns };
  }

  // 12. Expenses
  if (decoded.includes('Operational Expense') || decoded.includes('Operational%20Expense')) {
    return { data: store.expenses };
  }

  // 13. Query Reports fallback
  if (decoded.includes('query_report.run')) {
    return { message: { columns: [], result: [] } };
  }

  // Generic fallback
  return { data: [] };
}
