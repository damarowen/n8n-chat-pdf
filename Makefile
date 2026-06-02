SHELL := /bin/bash

# Root-level Makefile to control chat-ui
CHAT_UI_DIR := chat-ui
# Override with: make dev PACKAGE_MANAGER=pnpm
PACKAGE_MANAGER ?= npm
RUN := $(PACKAGE_MANAGER) run

.PHONY: help install env dev build start lint clean

help:
	@echo "Available targets:"
	@echo "  make dev      - Install deps, ensure .env, run Next dev server"
	@echo "  make build    - Build chat-ui"
	@echo "  make start    - Start built app"
	@echo "  make lint     - Run linter"
	@echo "  make install  - Install dependencies"
	@echo "  make env      - Copy .env.example to .env if missing"
	@echo "  make clean    - Remove .next build output"

install:
	cd "$(CHAT_UI_DIR)" && $(PACKAGE_MANAGER) install

env:
	cd "$(CHAT_UI_DIR)" && if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env && echo "Created chat-ui/.env from .env.example"; else echo ".env present or no .env.example"; fi

dev: install env
	cd "$(CHAT_UI_DIR)" && $(RUN) dev

build: install
	cd "$(CHAT_UI_DIR)" && $(RUN) build

start:
	cd "$(CHAT_UI_DIR)" && $(RUN) start

lint:
	cd "$(CHAT_UI_DIR)" && $(RUN) lint

clean:
	cd "$(CHAT_UI_DIR)" && rm -rf .next
