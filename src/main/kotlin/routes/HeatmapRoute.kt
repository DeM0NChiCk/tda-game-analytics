package ru.itis.tda.routes

import io.ktor.http.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.bson.types.ObjectId

import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.*
import ru.itis.tda.models.Game

import ru.itis.tda.service.heatmapService

fun Route.heatmapRoute(gameCollection: CoroutineCollection<Game>) {

    get("/api/heatmap") {

        val gameId = call.request.queryParameters["gameId"]
        val location = call.request.queryParameters["location"]
        val bins = call.request.queryParameters["bins"]?.toIntOrNull()?.coerceAtLeast(4) ?: 25

        val apiKey = call.principal<JWTPrincipal>()?.getClaim("apiKey", String::class)

        // Проверка обязательных параметров
        if (gameId.isNullOrBlank() || location.isNullOrBlank()) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing gameId or location"))
            return@get
        }

        if (apiKey.isNullOrBlank()) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing apiKey in token"))
            return@get
        }

        // Проверка существования игры и принадлежности пользователю
        val game = gameCollection.findOne(
            and(
                Game::id eq ObjectId(gameId),
                Game::ownerApiKey eq apiKey
            )
        )

        if (game == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("Game not found"))
            return@get
        }

        if (game.name.isBlank()) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing game name"))
            return@get
        }

        // Генерация тепловой карты
        val response = heatmapService(game = game.id.toHexString(), location = location, bins = bins)

        // Если локация не найдена или пуста
        if (response.location.isNullOrEmpty()) {
            call.respond(response)
            return@get
        }

        // Ответ
        call.respond(response)
    }
}