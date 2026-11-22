// ============================================================================
// UPTOWARE FLEET ERP - LOCAL DEMO DISPATCHER
// Intercepts and fulfills Frappe API requests using the local sandbox store
// when running locally (localhost:3001) in LOCAL_DEMO_MODE.
// Supports both Frappe REST ({ data: [...] }) and Frappe RPC ({ message: [...] })
// to ensure 100% bug-free compatibility with all front-end and BFF consumers.
// ============================================================================

import { localStore } from './localStore';

function makeResponse(result: any) {
  return {
    data: result,
    message: result,
  };
}

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

  // A. Vehicle Breakdown (must match before Vehicle)
  if (decoded.includes('Vehicle Breakdown') || decoded.includes('Vehicle%20Breakdown')) {
    return makeResponse(store.breakdowns);
  }

  // B. Vehicle Driver Shift Allocation (must match before Vehicle and Driver)
  if (decoded.includes('Vehicle Driver Shift Allocation') || decoded.includes('Vehicle%20Driver%20Shift%20Allocation') || decoded.includes('Shift Allocation')) {
    return makeResponse([]);
  }

  // C. Employee Attendance (must match before Employee)
  if (decoded.includes('Employee Attendance') || decoded.includes('Employee%20Attendance')) {
    if (method === 'POST') {
      const attId = `ATT-LOCAL-${Date.now().toString().slice(-4)}`;
      const rate = Number(body.daily_salary_rate || body.dailySalary || 850);
      const newAtt = {
        name: attId,
        employee: body.employee,
        employee_name: body.employee_name || 'Jisu Nayak',
        attendance_date: body.attendance_date,
        status: body.attendance_status || body.status || 'Present',
        attendance_status: body.attendance_status || body.status || 'Present',
        shift: body.shift || body.custom_shift || 'Shift A',
        custom_shift: body.shift || body.custom_shift || 'Shift A',
        mine_site: body.mine_site || store.mineSites[0].name,
        daily_salary_rate: rate,
        calculated_salary_amount: rate,
      };
      store.attendance.unshift(newAtt);
      localStore.save(store);
      return makeResponse(newAtt);
    }
    return makeResponse(store.attendance);
  }

  // 1. Vehicles
  if ((decoded.includes('/api/resource/Vehicle/') || decoded.includes('/api/resource/Vehicle?') || decoded.endsWith('/api/resource/Vehicle') || decoded.includes('doctype=Vehicle')) && !decoded.includes('Breakdown') && !decoded.includes('Shift Allocation')) {
    const parts = decoded.split('/api/resource/Vehicle');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.vehicles.find((v) => v.name === id || v.id === id || v.license_plate === id || v.licensePlate === id) || store.vehicles[0];
      return makeResponse(found);
    }
    if (method === 'POST') {
      const plate = body.license_plate || body.licensePlate || `OD-35-LOCAL-${Date.now().toString().slice(-4)}`;
      const newV = {
        name: plate,
        id: plate,
        license_plate: plate,
        licensePlate: plate,
        make: body.make || 'Tata Motors',
        model: body.model || 'Prima 3528.K',
        status: body.vehicle_status || body.status || 'Active',
        vehicle_status: body.vehicle_status || body.status || 'Active',
        vehicleStatus: body.vehicle_status || body.status || 'Active',
        assigned_driver: body.assigned_driver || null,
        assignedDriverId: body.assigned_driver || null,
        assignedDriverName: null,
        payload_capacity_tons: Number(body.payload_capacity_tons || body.payloadCapacityTons || 35),
        payloadCapacityTons: Number(body.payload_capacity_tons || body.payloadCapacityTons || 35),
        last_odometer: Number(body.last_odometer || body.lastOdometer || 0),
        lastOdometer: Number(body.last_odometer || body.lastOdometer || 0),
        fuel_type: body.fuel_type || body.fuelType || 'Diesel',
        fuelType: body.fuel_type || body.fuelType || 'Diesel',
        custom_transport_type: body.custom_transport_type || body.customTransportType || 'Transport',
        customTransportType: body.custom_transport_type || body.customTransportType || 'Transport',
        custom_vehicle_type: body.custom_vehicle_type || body.customVehicleType || 'Mining Tipper',
        customVehicleType: body.custom_vehicle_type || body.customVehicleType || 'Mining Tipper',
        end_date: body.end_date || '2027-11-20',
        fitness_expiry_date: body.fitness_expiry_date || '2027-10-15',
        puc_expiry_date: body.puc_expiry_date || '2027-09-01',
        road_tax_expiry_date: body.road_tax_expiry_date || '2027-12-31',
        permit_expiry_date: body.permit_expiry_date || '2028-05-15',
        is_test_record: 0,
      };
      store.vehicles.push(newV);
      localStore.save(store);
      return makeResponse(newV);
    }
    if (id && method === 'PUT') {
      const idx = store.vehicles.findIndex((v) => v.name === id || v.id === id || v.license_plate === id || v.licensePlate === id);
      if (idx !== -1) {
        store.vehicles[idx] = { ...store.vehicles[idx], ...body };
        localStore.save(store);
        return makeResponse(store.vehicles[idx]);
      }
    }
    return makeResponse(store.vehicles);
  }

  // 2. Employees
  if (decoded.includes('/api/resource/Employee') || decoded.includes('doctype=Employee')) {
    const parts = decoded.split('/api/resource/Employee');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.employees.find((e) => e.name === id || e.id === id) || store.employees[0];
      return makeResponse(found);
    }
    if (method === 'POST') {
      const empId = `HR-EMP-LOCAL-${Date.now().toString().slice(-4)}`;
      const fullName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.employee_name || 'New Employee';
      const salary = Number(body.custom_daily_salary_rate || body.custom_daily_salary || body.dailySalary || 850);
      const newEmp = {
        name: empId,
        id: empId,
        employee_name: fullName,
        employeeName: fullName,
        first_name: body.first_name || fullName.split(' ')[0] || '',
        firstName: body.first_name || fullName.split(' ')[0] || '',
        last_name: body.last_name || fullName.split(' ')[1] || '',
        lastName: body.last_name || fullName.split(' ')[1] || '',
        designation: body.designation || 'Staff',
        status: body.status || 'Active',
        custom_daily_salary: salary,
        custom_daily_salary_rate: salary,
        dailySalary: salary,
        department: body.department || 'Mining Operations',
        social_category: body.social_category || 'GENERAL',
        socialCategory: body.social_category || 'GENERAL',
        form_o_done: body.form_o_done || 'YES (Completed)',
        vt_no: body.vt_no || 'VT-LOCAL',
        gender: body.gender || 'Male',
        cell_number: body.cell_number || '+91 98765 00000',
        cellNumber: body.cell_number || '+91 98765 00000',
        date_of_joining: body.date_of_joining || '2026-01-01',
        dateOfJoining: body.date_of_joining || '2026-01-01',
      };
      store.employees.push(newEmp);
      localStore.save(store);
      return makeResponse(newEmp);
    }
    return makeResponse(store.employees);
  }

  // 3. Drivers
  if ((decoded.includes('/api/resource/Driver/') || decoded.includes('/api/resource/Driver?') || decoded.endsWith('/api/resource/Driver') || decoded.includes('doctype=Driver')) && !decoded.includes('Shift Allocation')) {
    const parts = decoded.split('/api/resource/Driver');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.drivers.find((d) => d.name === id || d.id === id) || store.drivers[0];
      return makeResponse(found);
    }
    if (method === 'POST') {
      const drvId = `DRV-LOCAL-${Date.now().toString().slice(-4)}`;
      const newD = {
        name: drvId,
        id: drvId,
        full_name: body.full_name || body.fullName || 'New Driver',
        fullName: body.full_name || body.fullName || 'New Driver',
        status: body.status || 'Active',
        cell_number: body.cell_number || body.cellNumber || null,
        cellNumber: body.cell_number || body.cellNumber || null,
        license_number: body.license_number || body.licenseNumber || null,
        licenseNumber: body.license_number || body.licenseNumber || null,
        issuing_date: body.issuing_date || '2022-01-01',
        issuingDate: body.issuing_date || '2022-01-01',
        expiry_date: body.expiry_date || '2032-01-01',
        expiryDate: body.expiry_date || '2032-01-01',
        medical_fitness_expiry: body.medical_fitness_expiry || '2027-01-01',
        medicalFitnessExpiry: body.medical_fitness_expiry || '2027-01-01',
        assigned_vehicle: body.assigned_vehicle || null,
        assignedVehicle: body.assigned_vehicle || null,
        safety_score: 95,
        safetyScore: 95,
        licenseStatus: 'valid',
        is_test_record: 0,
      };
      store.drivers.push(newD);
      localStore.save(store);
      return makeResponse(newD);
    }
    return makeResponse(store.drivers);
  }

  // 4. Mine Sites
  if (decoded.includes('Mine Site') || decoded.includes('Mine%20Site')) {
    return makeResponse(store.mineSites);
  }

  // 5. Fleet Leads
  if (decoded.includes('Fleet Lead') || decoded.includes('Fleet%20Lead')) {
    return makeResponse(store.leads);
  }

  // 6. Mining Trips
  if (decoded.includes('Mining Trip') || decoded.includes('Mining%20Trip')) {
    const parts = decoded.split('/api/resource/Mining Trip');
    const id = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';
    if (id && method === 'GET') {
      const found = store.trips.find((t) => t.id === id || t.name === id) || store.trips[0];
      return makeResponse(found);
    }
    if (method === 'POST') {
      const tripId = `TRIP-LOCAL-${Date.now().toString().slice(-4)}`;
      const count = Number(body.custom_trip_count || body.tripCount || 1);
      const avg = Number(body.custom_average_tonnage || body.averageTonnage || 35);
      const rate = Number(body.custom_lead_rate || body.rate_per_ton || body.ratePerTon || 120);
      const newTrip = {
        name: tripId,
        id: tripId,
        vehicle: body.vehicle || store.vehicles[0].name,
        driver: body.driver || store.drivers[0].name,
        driver_name: body.driver_name || store.drivers[0].full_name,
        driverName: body.driver_name || store.drivers[0].full_name,
        mine_site: body.mine_site || store.mineSites[0].name,
        mineSite: body.mine_site || store.mineSites[0].name,
        destination: body.destination || 'CHP Siding (0-4 km)',
        material_type: body.material_type || 'Coal',
        materialType: body.material_type || 'Coal',
        dispatch_date_time: body.dispatch_date_time || new Date().toISOString(),
        dispatchDateTime: body.dispatch_date_time || new Date().toISOString(),
        custom_shift: body.custom_shift || body.shift || 'Shift A',
        shift: body.custom_shift || body.shift || 'Shift A',
        custom_trip_count: count,
        tripCount: count,
        custom_average_tonnage: avg,
        averageTonnage: avg,
        custom_lead: body.custom_lead || body.lead || 'CHP',
        lead: body.custom_lead || body.lead || 'CHP',
        custom_lead_km: body.custom_lead_km || body.leadKm || 4,
        leadKm: body.custom_lead_km || body.leadKm || 4,
        custom_lead_rate: rate,
        leadRate: rate,
        custom_calculated_quantity: count * avg,
        calculatedQuantity: count * avg,
        custom_calculated_amount: count * avg * rate,
        calculatedAmount: count * avg * rate,
        net_weight_tons: count * avg,
        netWeightTons: count * avg,
        gross_revenue: count * avg * rate,
        grossRevenue: count * avg * rate,
        trip_status: 'Approved',
        tripStatus: 'Approved',
        workflow_state: 'Approved',
        workflowState: 'Approved',
        status: 'Approved',
        custom_opening_odometer: Number(body.custom_opening_odometer || 14200),
        openingOdometer: Number(body.custom_opening_odometer || 14200),
        custom_closing_odometer: Number(body.custom_closing_odometer || 14250),
        closingOdometer: Number(body.custom_closing_odometer || 14250),
        is_test_record: 0,
      };
      store.trips.unshift(newTrip);
      localStore.save(store);
      return makeResponse(newTrip);
    }
    if (id && method === 'PUT') {
      const idx = store.trips.findIndex((t) => t.id === id || t.name === id);
      if (idx !== -1) {
        store.trips[idx] = { ...store.trips[idx], ...body };
        localStore.save(store);
        return makeResponse(store.trips[idx]);
      }
    }
    return makeResponse(store.trips);
  }

  // 7. Fuel Logs
  if (decoded.includes('Fuel Log') || decoded.includes('Fuel%20Log')) {
    if (method === 'POST') {
      const lit = Number(body.fuel_liters || body.quantity_litres || 100);
      const rate = Number(body.cost_per_liter || body.cost_per_litre || 92.5);
      const odo = Number(body.odometer_reading || body.odometer_reading_km || 14250);
      const newFuel = {
        name: `FUEL-LOCAL-${Date.now().toString().slice(-4)}`,
        id: Date.now(),
        vehicle: body.vehicle || store.vehicles[0].name,
        driver: body.driver || store.drivers[0].name,
        mine_site: body.mine_site || store.mineSites[0].name,
        mineSite: body.mine_site || store.mineSites[0].name,
        fuel_date: body.date || body.fuel_date || new Date().toISOString().split('T')[0],
        date: body.date || body.fuel_date || new Date().toISOString().split('T')[0],
        quantity_litres: lit,
        fuelLiters: lit,
        cost_per_litre: rate,
        costPerLiter: rate,
        total_fuel_cost: lit * rate,
        totalCost: lit * rate,
        odometer_reading_km: odo,
        odometerReading: odo,
        previous_odometer_km: odo - 200,
        distance_travelled_km: 200,
        approval_status: 'Approved',
        approvalStatus: 'Approved',
        is_full_tank: 1,
        isFullTank: true,
        km_per_litre: 2.0,
        fuel_type: 'Diesel',
        fuelType: 'Diesel',
        fuel_source: 'Direct Bowser Refuel',
        dispensationMode: 'Direct Bowser Refuel',
        supplier: 'IOCL Commercial Fleet Depot',
        is_test_record: 0,
      };
      store.fuelLogs.unshift(newFuel);
      localStore.save(store);
      return makeResponse(newFuel);
    }
    return makeResponse(store.fuelLogs);
  }

  // 8. Items / Spare Parts
  if (decoded.includes('/api/resource/Item') || decoded.includes('doctype=Item')) {
    if (method === 'POST') {
      const itemCode = body.item_code || `SP-LOCAL-${Date.now().toString().slice(-4)}`;
      const rate = Number(body.standard_rate || body.valuation_rate || 100);
      const newItem = {
        name: itemCode,
        id: itemCode,
        item_code: itemCode,
        item_name: body.item_name || 'New Spare Part',
        itemName: body.item_name || 'New Spare Part',
        item_group: body.item_group || body.itemGroup || 'General Spares',
        itemGroup: body.item_group || body.itemGroup || 'General Spares',
        stock_uom: body.stock_uom || 'Nos',
        stockUom: body.stock_uom || 'Nos',
        standard_rate: rate,
        standardRate: rate,
        valuation_rate: rate,
        valuationRate: rate,
        is_stock_item: 1,
        reorderLevel: 2,
        reorderQty: 5,
        currentStock: 10,
        custom_part_number: body.custom_part_number || 'OEM-REF',
        oemPartNumber: body.custom_part_number || 'OEM-REF',
        custom_compatible_vehicle_model: body.custom_compatible_vehicle_model || 'All Fleet',
        compatibleModel: body.custom_compatible_vehicle_model || 'All Fleet',
        custom_preferred_supplier: body.custom_preferred_supplier || 'Talcher Auto Spares',
        preferredSupplier: body.custom_preferred_supplier || 'Talcher Auto Spares',
        custom_is_test_record: 0,
      };
      store.items.push(newItem);
      store.bins.push({
        name: `BIN-${itemCode}`,
        item_code: itemCode,
        warehouse: 'Stores - U',
        actual_qty: 10,
        reserved_qty: 0,
        ordered_qty: 0,
        projected_qty: 10,
        valuation_rate: rate,
        stock_value: 10 * rate,
      });
      localStore.save(store);
      return makeResponse(newItem);
    }
    return makeResponse(store.items);
  }

  // 9. Bins
  if (decoded.includes('/api/resource/Bin') || decoded.includes('doctype=Bin')) {
    return makeResponse(store.bins || []);
  }

  // 10. Purchase Orders
  if (decoded.includes('Purchase Order') || decoded.includes('Purchase%20Order')) {
    if (method === 'POST') {
      const poId = `PUR-ORD-LOCAL-${Date.now().toString().slice(-4)}`;
      const total = Number(body.grand_total || 15000);
      const newPO = {
        name: poId,
        id: poId,
        supplier: body.supplier || 'Talcher Auto Spares',
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
        transactionDate: body.transaction_date || new Date().toISOString().split('T')[0],
        schedule_date: body.schedule_date || new Date().toISOString().split('T')[0],
        scheduleDate: body.schedule_date || new Date().toISOString().split('T')[0],
        grand_total: total,
        grandTotal: total,
        status: 'Submitted',
        docstatus: 1,
        custom_procurement_type: body.custom_procurement_type || 'Spare Parts Replenishment',
        procurementType: body.custom_procurement_type || 'Spare Parts Replenishment',
        custom_vehicle: body.custom_vehicle || null,
        vehicle: body.custom_vehicle || null,
        custom_mine_site: body.custom_mine_site || store.mineSites[0].name,
        mineSite: body.custom_mine_site || store.mineSites[0].name,
        custom_approved_by: 'demo.admin@uptoware.com',
        approvedBy: 'demo.admin@uptoware.com',
        custom_is_test_record: 0,
        items: body.items || [],
      };
      store.purchaseOrders.unshift(newPO);
      localStore.save(store);
      return makeResponse(newPO);
    }
    return makeResponse(store.purchaseOrders);
  }

  // 11. Expenses
  if (decoded.includes('Operational Expense') || decoded.includes('Operational%20Expense')) {
    return makeResponse(store.expenses);
  }

  // 12. Designations
  if (decoded.includes('/api/resource/Designation') || decoded.includes('doctype=Designation')) {
    if (method === 'POST') {
      const desigName = (body.designation_name || body.name || '').trim();
      if (desigName && !store.designations.includes(desigName)) {
        store.designations.push(desigName);
        localStore.save(store);
      }
      return makeResponse({ name: desigName, designation_name: desigName });
    }
    const desigList = (store.designations || []).map((d: string) => ({ name: d, designation_name: d }));
    return makeResponse(desigList);
  }

  // 13. Customers
  if (decoded.includes('/api/resource/Customer') || decoded.includes('doctype=Customer')) {
    return makeResponse([
      { name: 'Mahanadi Coalfields Limited', customer_name: 'Mahanadi Coalfields Limited', id: 'Mahanadi Coalfields Limited' },
    ]);
  }

  // 14. Warehouses
  if (decoded.includes('/api/resource/Warehouse') || decoded.includes('doctype=Warehouse')) {
    return makeResponse([
      { name: 'Stores - U', warehouse_name: 'Stores', is_group: 0 },
    ]);
  }

  // 15. Suppliers
  if (decoded.includes('/api/resource/Supplier') || decoded.includes('doctype=Supplier')) {
    return makeResponse([
      { name: 'Talcher Auto Spares', supplier_name: 'Talcher Auto Spares', supplier_group: 'Spare Parts' },
      { name: 'IOCL Commercial Fleet Depot', supplier_name: 'IOCL Commercial Fleet Depot', supplier_group: 'Fuel' },
    ]);
  }

  // 16. Workflow transitions
  if (decoded.includes('frappe.model.workflow.get_transitions') || decoded.includes('frappe.model.workflow.apply_workflow')) {
    return makeResponse({ workflow_state: 'Approved', status: 'Approved' });
  }

  // 17. Query Reports fallback
  if (decoded.includes('query_report.run')) {
    return { message: { columns: [], result: [] } };
  }

  // Generic fallback
  return makeResponse([]);
}
