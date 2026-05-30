// Copyright (c) 2024, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Shift Location", {
	refresh: async (frm) => {
		const allow_geolocation_tracking = await frappe.db.get_single_value(
			"HR Settings",
			"allow_geolocation_tracking",
		);

		if (!allow_geolocation_tracking)
			hide_field([
				"checkin_radius",
				"fetch_geolocation",
				"latitude",
				"longitude",
				"geolocation",
			]);

		if (!frm.doc.__islocal)
			hrms.add_shift_tools_button_to_form(frm, {
				action: "Assign Shift",
				shift_location: frm.doc.name,
			});
	},

	fetch_geolocation: (frm) => {
		hrms.fetch_geolocation(frm);
	},
});

frappe.ui.form.on("Shift Location Zone", {
	fetch_geolocation: (frm, cdt, cdn) => {
		if (!navigator.geolocation) {
			frappe.msgprint({
				message: __("Geolocation is not supported by your current browser"),
				title: __("Geolocation Error"),
				indicator: "red",
			});
			return;
		}

		frappe.dom.freeze(__("Fetching your geolocation") + "...");

		navigator.geolocation.getCurrentPosition(
			(position) => {
				frappe.dom.unfreeze();
				frappe.model.set_value(cdt, cdn, "latitude", position.coords.latitude);
				frappe.model.set_value(cdt, cdn, "longitude", position.coords.longitude);
				frappe.show_alert({
					message: __("Location fetched successfully"),
					indicator: "green",
				});
			},
			(error) => {
				frappe.dom.unfreeze();
				let msg = __("Unable to retrieve your location");
				if (error) {
					msg += "<br><br>" + __("ERROR({0}): {1}", [error.code, error.message]);
				}
				frappe.msgprint({ message: msg, title: __("Geolocation Error"), indicator: "red" });
			},
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	},
});
