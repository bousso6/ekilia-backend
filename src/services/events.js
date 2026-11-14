const loadService = async (specifier) => {
  try {
    return await import(specifier);
  } catch {
    return null;
  }
};

const callHook = async (specifier, name, payload) => {
  const service = await loadService(specifier);
  const hook = service?.[name] || service?.default?.[name];

  if (typeof hook === 'function') {
    await hook(payload);
  }
};

export const logActivity = (payload) =>
  callHook('./activity.service.js', 'logActivity', payload);

export const notify = (payload) =>
  callHook('./notification.service.js', 'notify', payload);
