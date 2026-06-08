module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        'http://127.0.0.1:3210/',
        'http://127.0.0.1:3210/blog',
        'http://127.0.0.1:3210/navigation',
        'http://127.0.0.1:3210/posts/2026-05-25-getting-started',
      ],
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'output/lighthouse',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
};
