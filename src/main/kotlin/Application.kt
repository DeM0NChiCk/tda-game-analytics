package ru.itis.tda

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import ru.itis.tda.auth.*
import ru.itis.tda.routes.authRoutes
import ru.itis.tda.routes.collectRoutes
import ru.itis.tda.routes.heatmapRoute
import ru.itis.tda.routes.webSocketRoutes

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    install(CORS) {
        anyHost() // Разрешает запросы с любого хоста; для безопасности в продакшене укажите конкретные хосты
        allowMethod(HttpMethod.Options) // Разрешает preflight-запросы
        allowMethod(HttpMethod.Post) // Разрешает POST-запросы
        allowHeader(HttpHeaders.ContentType) // Разрешает заголовок Content-Type
        allowHeader(HttpHeaders.Authorization) // Разрешает заголовок Authorization
        allowCredentials = true // Разрешает передачу учетных данных (например, cookies)
    }

    install(ContentNegotiation) {
        json()
    }

    install(WebSockets)

    install(Authentication) {
        jwt("auth-jwt") {
            realm = AuthConfig.realm
            verifier(AuthConfig.verifier)
            validate { credential ->
                if (credential.payload.getClaim("apiKey").asString() != "null") JWTPrincipal(credential.payload) else null
            }
        }
    }

    routing {

        authRoutes()
        authenticate("auth-jwt") {
            collectRoutes()
            webSocketRoutes()
            heatmapRoute()
        }
    }
}

