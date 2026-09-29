/* Tracker Web Push service worker */
self.addEventListener("push", (event) => {
	let data = {
		title: "Трекер",
		body: "",
		url: "/tracker/my-tasks",
		tag: "tracker-push",
	};
	try {
		if (event.data) {
			const parsed = event.data.json();
			data = {
				title: typeof parsed.title === "string" ? parsed.title : data.title,
				body: typeof parsed.body === "string" ? parsed.body : data.body,
				url: typeof parsed.url === "string" ? parsed.url : data.url,
				tag: typeof parsed.tag === "string" ? parsed.tag : data.tag,
			};
		}
	} catch {
		try {
			const text = event.data?.text?.() ?? "";
			if (text) data.body = text;
		} catch {
			/* ignore */
		}
	}

	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			tag: data.tag,
			data: { url: data.url },
			renotify: true,
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const rawUrl =
		event.notification?.data?.url &&
		typeof event.notification.data.url === "string"
			? event.notification.data.url
			: "/tracker/my-tasks";
	const targetUrl = new URL(rawUrl, self.location.origin).href;

	event.waitUntil(
		(async () => {
			const clientsList = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			for (const client of clientsList) {
				if ("focus" in client) {
					await client.focus();
					if ("navigate" in client) {
						await client.navigate(targetUrl);
					}
					return;
				}
			}
			if (self.clients.openWindow) {
				await self.clients.openWindow(targetUrl);
			}
		})(),
	);
});
