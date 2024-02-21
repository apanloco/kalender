FROM rust AS build
WORKDIR /app
COPY ./ /app
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target=x86_64-unknown-linux-musl

FROM scratch
COPY --from=build /app/target/x86_64-unknown-linux-musl/release/kalender /kalender
COPY --from=build /app/static /static
CMD ["/kalender", "--port", "80"]
