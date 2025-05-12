package ru.itis.tda.routes

import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.litote.kmongo.eq
import ru.itis.tda.auth.JwtService
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.User

@Serializable
data class AuthRequest(val apiKey: String)

fun Route.authRoutes() {
    post("/token") {
        try {
            val request = call.receive<AuthRequest>()
            val user = MongoClientProvider.users.findOne(User::apiKey eq request.apiKey)
            if (user != null) {
                val token = JwtService.generateToken(request.apiKey)
                call.respond(mapOf("token" to token))
            } else {
                call.respondText("Invalid API key", status = io.ktor.http.HttpStatusCode.Unauthorized)
            }
        } catch (e: Exception) {
            println("Error processing request: ${e.message}")
            call.respondText("Invalid request format. Expected: {\"apiKey\": \"your_api_key\"}", 
                status = io.ktor.http.HttpStatusCode.BadRequest)
        }
    }
}