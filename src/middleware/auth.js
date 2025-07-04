export const mockAuth = (req, res, next) => {
  const userId = req.header('x-user-id');
  const username = req.header('x-user-name');
  if (userId) {
    req.user = { id: userId, username: username || 'Anonymous' };
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
