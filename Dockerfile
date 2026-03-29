FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
RUN npx nest build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
