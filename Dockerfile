FROM rust AS build

WORKDIR /app
COPY ./ /app
RUN apt update && apt -y upgrade && apt install -y --no-install-recommends libssl-dev 
RUN apt install pkg-config
RUN rustup target add aarch64-unknown-linux-musl
RUN cargo build --release --target=aarch64-unknown-linux-musl

FROM scratch
COPY --from=build /app/target/aarch64-unknown-linux-musl/release/calendar-api /calendar-api
CMD ["/calendar-api", "--port", "80"]
