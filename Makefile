.PHONY: lint lint-fix typecheck dev run-local build generate preview

lint:
	yarn lint

lint-fix:
	yarn lint:fix

typecheck:
	yarn typecheck

dev:
	yarn dev

# Run di jaringan lokal (HP / device lain bisa akses via IP LAN)
# Auto-detect IP: 192.168.x.x, pakai NUXT_PUBLIC_NITIP_API_URL=http://<IP>:8000 agar HP bisa hit backend
# Contoh: make run-local  -> http://192.168.1.5:3000  (API -> http://192.168.1.5:8000)
#         make run-local PORT=3001 API_URL=http://192.168.1.5:8000
PORT ?= 3000
API_URL ?=
HOST_IP ?= $(shell hostname -I | awk '{print $$1}')
run-local:
	@echo "🌐 Detected HOST_IP=$(HOST_IP)"
	@LOCAL_API=$(if $(API_URL),$(API_URL),http://$(HOST_IP):8000); \
	echo "🔗 Using API_URL=$$LOCAL_API"; \
	echo "🚀 Starting Nuxt dev on 0.0.0.0:$(PORT) (accessible at http://$(HOST_IP):$(PORT))"; \
	echo "   HP di jaringan sama buka: http://$(HOST_IP):$(PORT)"; \
	echo "   Pastikan nitip-core jalan di 0.0.0.0:8000 (make run atau docker)"; \
	NUXT_PUBLIC_NITIP_API_URL=$$LOCAL_API PORT=$(PORT) HOST=0.0.0.0 yarn dev --host 0.0.0.0 --port $(PORT)

build:
	yarn build

generate:
	yarn generate

preview:
	yarn preview
