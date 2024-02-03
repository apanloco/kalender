FROM rust AS build

WORKDIR /app
COPY ./ /app
RUN apt update && apt -y upgrade && apt install -y --no-install-recommends libssl-dev 
RUN apt install pkg-config
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target=x86_64-unknown-linux-musl

FROM scratch
COPY --from=build /app/target/x86_64-unknown-linux-musl/release/calendar-api /calendar-api
CMD ["/calendar-api", "--port", "80"]
