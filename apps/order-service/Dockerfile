FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/order-service ./cmd

FROM alpine:3.19
COPY --from=build /out/order-service /usr/local/bin/order-service
CMD ["order-service"]
