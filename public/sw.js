// Service Worker za Native Web Push
self.addEventListener('push', function (event) {
  var data = { title: 'SalonPro', body: '', icon: '/favicon.ico', badge: '/favicon.ico', url: '/' }

  if (event.data) {
    try {
      var parsed = event.data.json()
      for (var key in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          data[key] = parsed[key]
        }
      }
    } catch (_) {
      data.body = event.data.text()
    }
  }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url },
  }))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = event.notification.data && event.notification.data.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
