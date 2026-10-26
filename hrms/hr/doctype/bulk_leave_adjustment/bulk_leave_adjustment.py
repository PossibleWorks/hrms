# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class BulkLeaveAdjustment(Document):
	def validate(self):
		self.validate_employees()

	def validate_employees(self):
		if not self.employees:
			frappe.throw(_("Please add at least one employee to process."))

	def on_submit(self):
		for row in self.employees:
			self._process_row(row)

	def _process_row(self, row):
		try:
			adj = self._create_leave_adjustment(row)
			old_balance = adj.allocated_leaves
			new_balance = adj.leaves_after_adjustment

			self._add_allocation_comment(row, old_balance, new_balance)

			# Update in-memory row object so Frappe's db_update() after on_submit
			# picks up the correct values. Using frappe.db.set_value here would be
			# overwritten by db_update() which runs after on_submit completes.
			row.leave_adjustment = adj.name
			row.status = "Success"
			row.error_message = ""
		except Exception as e:
			row.status = "Failed"
			row.error_message = str(e)
			frappe.log_error(
				title=f"Bulk Leave Adjustment failed for {row.employee}",
				message=frappe.get_traceback(),
			)

	def _create_leave_adjustment(self, row):
		adj = frappe.new_doc("Leave Adjustment")
		adj.employee = row.employee
		adj.employee_name = row.employee_name
		adj.leave_type = row.leave_type
		adj.leave_allocation = row.leave_allocation
		adj.adjustment_type = row.adjustment_type
		adj.leaves_to_adjust = row.leaves_to_adjust
		adj.posting_date = self.posting_date
		adj.insert(ignore_permissions=True)
		adj.submit()
		return adj

	def _add_allocation_comment(self, row, old_balance, new_balance):
		allocation_doc = frappe.get_doc("Leave Allocation", row.leave_allocation)
		allocation_doc.add_comment(
			"Comment",
			_(
				"Leave balance updated from <b>{0}</b> to <b>{1}</b> by Bulk Leave Adjustment {2}."
			).format(old_balance, new_balance, self.name),
		)

	def on_cancel(self):
		for row in self.employees:
			if row.leave_adjustment:
				self._cancel_leave_adjustment(row)

	def _cancel_leave_adjustment(self, row):
		adj = frappe.get_doc("Leave Adjustment", row.leave_adjustment)
		if adj.docstatus == 1:
			adj.cancel()
			self._add_cancellation_comment(row)

	def _add_cancellation_comment(self, row):
		allocation_doc = frappe.get_doc("Leave Allocation", row.leave_allocation)
		allocation_doc.add_comment(
			"Comment",
			_(
				"Leave balance adjustment cancelled via Bulk Leave Adjustment {0}."
			).format(self.name),
		)
