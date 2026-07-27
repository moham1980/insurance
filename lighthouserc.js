module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
      ],
      numberOfRuns: 3,
      startServerCommand: 'bun run --filter web-ui dev',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 120000,
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
      },
    },
  },
};
