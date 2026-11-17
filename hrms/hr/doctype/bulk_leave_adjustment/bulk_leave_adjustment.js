// Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Bulk Leave Adjustment", {
	refresh(frm) {
		// Filter leave_allocation in child table by employee, leave_type, and posting_date
		frm.set_query("leave_allocation", "employees", function (doc, cdt, cdn) {
			let row = locals[cdt][cdn];
			return {
				filters: {
					employee: row.employee,
					leave_type: row.leave_type,
					from_date: ["<=", doc.posting_date],
					to_date: [">=", doc.posting_date],
					docstatus: 1,
				},
			};
		});
	},
});

frappe.ui.form.on("Bulk Leave Adjustment Employee", {
	employee(frm, cdt, cdn) {
		fetch_leave_allocation(frm, cdt, cdn);
	},

	leave_type(frm, cdt, cdn) {
		fetch_leave_allocation(frm, cdt, cdn);
	},
});

function fetch_leave_allocation(frm, cdt, cdn) {
	let row = locals[cdt][cdn];

	if (!row.employee || !row.leave_type || !frm.doc.posting_date) return;

	frappe.call({
		method: "hrms.hr.doctype.leave_adjustment.leave_adjustment.get_leave_allocation_for_posting_date",
		args: {
			employee: row.employee,
			leave_type: row.leave_type,
			posting_date: frm.doc.posting_date,
		},
		callback(r) {
			if (r.message?.length) {
				frappe.model.set_value(cdt, cdn, "leave_allocation", r.message[0].name);
			} else {
				frappe.model.set_value(cdt, cdn, "leave_allocation", null);
				frappe.msgprint(
					__(
						"No active leave allocation found for {0} for leave type {1} on {2}.",
						[row.employee_name || row.employee, row.leave_type, frm.doc.posting_date]
					)
				);
			}
		},
	});
}
