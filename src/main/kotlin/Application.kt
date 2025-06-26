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
import org.litote.kmongo.coroutine.CoroutineCollection
import ru.itis.tda.auth.*
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.Game
import ru.itis.tda.models.User
import ru.itis.tda.routes.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    install(CORS) {
        anyHost()
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Post)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowCredentials = true
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

    val mongoGames: CoroutineCollection<Game> = MongoClientProvider.games
    val mongoUsers: CoroutineCollection<User> = MongoClientProvider.users

    routing {
        authRoutes()
        webSocketRoutes(mongoGames)
        collectRoutes(mongoGames)
        authenticate("auth-jwt") {
            heatmapRoute(mongoGames)
            gameRoute(mongoUsers, mongoGames)
            analyticsRoutes(mongoGames)
        }
    }
}

