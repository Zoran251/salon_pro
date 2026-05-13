// lib/notifications/notification-templates.ts

export interface NotificationTemplate {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Šabloni za push notifikacije
 */
export const pushNotificationTemplates = {
  /**
   * Potvrda zakazivanja termina za korisnika
   */
  appointmentConfirmed: (
    salonName: string,
    dateTime: string,
    serviceName: string
  ): NotificationTemplate => ({
    title: 'Termin potvrđen! ✅',
    body: `${salonName} - ${serviceName} na ${dateTime}`,
    data: {
      type: 'appointment_confirmed',
      action: 'open_appointment',
    },
  }),

  /**
   * Obaveštenje o promeni termina
   */
  appointmentUpdated: (
    salonName: string,
    oldTime: string,
    newTime: string
  ): NotificationTemplate => ({
    title: 'Termin promenjen 🔄',
    body: `${salonName}: sa ${oldTime} na ${newTime}`,
    data: {
      type: 'appointment_updated',
      action: 'view_appointment',
    },
  }),

  /**
   * Obaveštenje o otkazivanju termina
   */
  appointmentCancelled: (
    salonName: string,
    dateTime: string
  ): NotificationTemplate => ({
    title: 'Termin otkazan ❌',
    body: `${salonName} - ${dateTime}`,
    data: {
      type: 'appointment_cancelled',
      action: 'view_appointments',
    },
  }),

  /**
   * Podsetnik pre termina
   */
  appointmentReminder: (
    salonName: string,
    timeUntilAppointment: string
  ): NotificationTemplate => ({
    title: 'Podsetnik: Termin uskoro! ⏰',
    body: `${salonName} - ${timeUntilAppointment}`,
    data: {
      type: 'appointment_reminder',
      action: 'view_appointment',
    },
  }),

  /**
   * Obaveštenje salonu o novom zakazivanju
   */
  newAppointment: (
    clientName: string,
    serviceName: string,
    dateTime: string
  ): NotificationTemplate => ({
    title: 'Novi termin! 📅',
    body: `${clientName} - ${serviceName} na ${dateTime}`,
    data: {
      type: 'new_appointment',
      action: 'view_appointment_details',
    },
  }),

  /**
   * Obaveštenje salonu o promeni termina
   */
  appointmentUpdatedSalon: (
    clientName: string,
    oldTime: string,
    newTime: string
  ): NotificationTemplate => ({
    title: 'Termin promenjen! 🔄',
    body: `${clientName}: sa ${oldTime} na ${newTime}`,
    data: {
      type: 'appointment_updated_salon',
      action: 'view_appointment_details',
    },
  }),

  /**
   * Obaveštenje salonu o otkazivanju
   */
  appointmentCancelledSalon: (
    clientName: string,
    serviceName: string,
    dateTime: string
  ): NotificationTemplate => ({
    title: 'Termin otkazan! ❌',
    body: `${clientName} - ${serviceName} ${dateTime}`,
    data: {
      type: 'appointment_cancelled_salon',
      action: 'view_cancellation_details',
    },
  }),

  /**
   * Obaveštenje za napravljivanje (no-show)
   */
  noShowAlert: (clientName: string): NotificationTemplate => ({
    title: 'Klijent se nije pojavio! ⚠️',
    body: `${clientName} se nije pojavio na zakazani termin.`,
    data: {
      type: 'no_show_alert',
      action: 'view_appointment_details',
    },
  }),

  /**
   * Obaveštenje o dostupnosti vremena (ako je korisnik postavio alert)
   */
  timeSlotAvailable: (
    salonName: string,
    timeSlot: string
  ): NotificationTemplate => ({
    title: 'Slobodno vreme! 📍',
    body: `${salonName} ima slobodno ${timeSlot}`,
    data: {
      type: 'time_slot_available',
      action: 'book_appointment',
    },
  }),

  /**
   * Opšta notifikacija
   */
  generic: (title: string, body: string): NotificationTemplate => ({
    title,
    body,
    data: {
      type: 'generic_notification',
    },
  }),
}

/**
 * Šabloni za WhatsApp/SMS poruke
 */
export const whatsappTemplates = {
  /**
   * Potvrda zakazivanja termina
   */
  appointmentConfirmed: (
    salonName: string,
    dateTime: string,
    serviceName: string,
    salonPhone: string
  ): string => `
🎉 Termin je potvrđen!

Salon: ${salonName}
Usluga: ${serviceName}
Datum i vreme: ${dateTime}

Ako trebate da promenite termin, odgovorite na ovu poruku ili pozovite ${salonPhone}

Hvala što ste nam odabrali!
`,

  /**
   * Obaveštenje o promeni termina od strane salona
   */
  appointmentUpdatedByAdmin: (
    salonName: string,
    oldTime: string,
    newTime: string,
    reason?: string
  ): string => `
🔄 Vaš termin je promenjen

Salon: ${salonName}
Staro vreme: ${oldTime}
Novo vreme: ${newTime}
${reason ? `Razlog: ${reason}` : ''}

Ako vam to ne odgovara, kontaktirajte salon.
`,

  /**
   * Obaveštenje o otkazivanju
   */
  appointmentCancelled: (
    salonName: string,
    dateTime: string,
    reason?: string
  ): string => `
❌ Termin je otkazan

Salon: ${salonName}
Datum i vreme: ${dateTime}
${reason ? `Razlog: ${reason}` : ''}

Možete zakazati novi termin kapljom aplikacije ili poziva salon.
`,

  /**
   * Podsetnik pre termina za korisnika
   */
  appointmentReminderClient: (
    salonName: string,
    dateTime: string,
    serviceName: string
  ): string => `
⏰ Podsetnik: Vaš termin je uskoro!

Salon: ${salonName}
Usluga: ${serviceName}
Vreme: ${dateTime}

Molimo vas da stignet na vreme. Ako ne možete da dođete, otkazite termin.
`,

  /**
   * Obaveštenje salonu o novom zakazivanju
   */
  newAppointmentSalon: (
    clientName: string,
    clientPhone: string,
    serviceName: string,
    dateTime: string
  ): string => `
📅 NOVI TERMIN

Klijent: ${clientName}
Broj: ${clientPhone}
Usluga: ${serviceName}
Vreme: ${dateTime}

Proverite dashboard za više detalja.
`,

  /**
   * HITNA notifikacija salonu o promeni od klijenta
   */
  urgentAppointmentChange: (
    clientName: string,
    oldTime: string,
    newTime: string
  ): string => `
🚨 HITNA PROMENA TERMINA!

Klijent: ${clientName}
Staro vreme: ${oldTime}
Novo vreme: ${newTime}

Molimo proverite da li je novo vreme slobodno.
`,

  /**
   * Obaveštenje salonu o otkazivanju od strane klijenta
   */
  appointmentCancelledByClient: (
    clientName: string,
    clientPhone: string,
    dateTime: string
  ): string => `
❌ TERMIN OTKAZAN KLIJENTOM

Klijent: ${clientName}
Broj: ${clientPhone}
Vreme: ${dateTime}

Vreme je sada slobodno.
`,

  /**
   * Potvrda primene WhatsApp verifikacije
   */
  verificationCode: (code: string): string => `
✅ Kod za verifikaciju: ${code}

Validan je 10 minuta. Ne delite kod sa nikime.
`,

  /**
   * Provera dostupnosti broja
   */
  serviceCheck: (): string => `
✅ WhatsApp servis je aktivan. Možete primati notifikacije o vašim terminima.
`,

  /**
   * Opšta poruka
   */
  generic: (message: string): string => message,
}

/**
 * Helper funkcije za formatiranje vremena
 */
export const formatters = {
  /**
   * Formatiraj datum i vreme na srpskom
   */
  dateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  },

  /**
   * Formatiraj samo datum
   */
  dateOnly: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  },

  /**
   * Formatiraj samo vreme
   */
  timeOnly: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    })
  },

  /**
   * Relatvno vreme do termina
   */
  timeUntil: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffMins = Math.round(diffMs / 60000)

    if (diffMins < 0) return 'Termin je prošao'
    if (diffMins === 0) return 'Sada'
    if (diffMins < 60) return `${diffMins} minuta`
    if (diffMins < 1440) return `${Math.round(diffMins / 60)} sati`
    return `${Math.round(diffMins / 1440)} dana`
  },
}
