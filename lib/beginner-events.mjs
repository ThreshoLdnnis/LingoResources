const shanghaiDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai'});

function validDeadline(value) {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

// Editorial recommendations are independent of the general featured selection.
// Date-only deadlines remain visible through their last day in Shanghai.
export function selectBeginnerEvents(resources, now = new Date()) {
  const today = shanghaiDate.format(now);
  return resources.filter(resource => resource.kind === 'competition'
    && resource.status === 'published' && resource.beginner_recommended === true
    && (resource.deadline == null || resource.deadline === ''
      || (validDeadline(resource.deadline) && resource.deadline >= today)));
}
