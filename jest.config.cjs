module.exports = {
  projects: [
    {
      displayName: "server",
      testEnvironment: "node",
      roots: [
        "<rootDir>/apps/api",
        "<rootDir>/apps/worker",
        "<rootDir>/packages",
      ],
      testMatch: ["**/*.test.ts"],
      extensionsToTreatAsEsm: [".ts"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: {
              module: "ESNext",
              moduleResolution: "Bundler",
              verbatimModuleSyntax: false,
            },
          },
        ],
      },
      moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
    },
    {
      displayName: "client",
      rootDir: "./apps/client",
      preset: "jest-expo",
      testMatch: ["**/*.test.ts", "**/*.test.tsx"],
      testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    },
  ],
};
