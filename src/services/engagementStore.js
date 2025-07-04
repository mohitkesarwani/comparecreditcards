export const engagements = {};

export const likedIpCache = new Map();

export const getEngagement = productId => {
  if (!engagements[productId]) {
    engagements[productId] = { likes: 0, shares: 0, comments: 0, reviews: [], rating: 0 };
  }
  return engagements[productId];
};

export const populateDummyEngagements = () => {
  if (Object.keys(engagements).length > 0) return;
  const sample = [
    {
      id: '123',
      likes: 10,
      shares: 4,
      reviews: [
        { name: 'Alice', comment: 'Great product', stars: 5 },
        { name: 'Bob', comment: 'Works well', stars: 4 },
        { name: 'Carol', comment: 'Pretty good', stars: 4 },
        { name: 'Dave', comment: 'Not bad', stars: 3 },
        { name: 'Eve', comment: 'Excellent', stars: 5 }
      ]
    },
    {
      id: '456',
      likes: 5,
      shares: 2,
      reviews: [
        { name: 'Frank', comment: 'Okay', stars: 3 },
        { name: 'Grace', comment: 'Nice', stars: 4 },
        { name: 'Heidi', comment: 'Could be better', stars: 2 },
        { name: 'Ivan', comment: 'Loved it', stars: 5 },
        { name: 'Judy', comment: 'Good value', stars: 4 }
      ]
    },
    {
      id: '789',
      likes: 7,
      shares: 3,
      reviews: [
        { name: 'Mallory', comment: 'Solid', stars: 4 },
        { name: 'Niaj', comment: 'Great', stars: 5 },
        { name: 'Olivia', comment: 'Decent', stars: 3 },
        { name: 'Peggy', comment: 'Fantastic', stars: 5 },
        { name: 'Trent', comment: 'Works for me', stars: 4 }
      ]
    }
  ];
  for (const item of sample) {
    const data = getEngagement(item.id);
    data.likes = item.likes;
    data.shares = item.shares;
    for (const r of item.reviews) {
      data.reviews.push({ ...r, timestamp: new Date() });
    }
    data.comments = data.reviews.length;
    data.rating = data.reviews.reduce((sum, r) => sum + r.stars, 0) / data.reviews.length;
  }
};
