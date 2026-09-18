/** Shared by the API and interface; ownership is still checked separately on the server. */
export function bookingActions(booking: { status: string; slot: string }, day: string,
  cancelHours: number, staff = false, now = Date.now()) {
  const start = new Date(`${day}T${booking.slot}:00-03:00`).getTime();
  const hours = (start - now) / 3600000;
  const active = ['agendado', 'confirmado'].includes(booking.status);
  const future = Number.isFinite(hours) && hours > 0;
  const canDecline = active && future && booking.status === 'agendado' && hours <= 24;
  const canCancelNormally = active && future && (staff || hours >= cancelHours);
  return {
    canConfirm: active && future && booking.status === 'agendado',
    canCancel: canCancelNormally || canDecline,
    canCancelNormally,
    canDecline,
    canMarkAbsent: active && !future && Number.isFinite(hours) && staff,
    explanation: !active ? '' : !future ? 'Horário encerrado. Procure a Secretaria para atualizar a situação.'
      : !(staff || hours >= cancelHours || canDecline) ? 'Prazo de cancelamento online encerrado. Entre em contato com a Secretaria.' : '',
  };
}
