package ru.itis.tda.routes

import io.ktor.http.*
import io.ktor.http.HttpStatusCode.Companion.BadRequest
import io.ktor.http.HttpStatusCode.Companion.Unauthorized
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

import kotlinx.serialization.Serializable

import org.litote.kmongo.eq
import org.mindrot.jbcrypt.BCrypt

import ru.itis.tda.auth.JwtService
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.User

import java.util.*

@Serializable
data class RegisterRequest(val email: String, val password: String)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class AuthResponse(val token: String, val apiKey: String)

@Serializable
data class AuthRequest(val apiKey: String)

fun Route.authRoutes() {

    post("/register") {
        val request = call.receive<RegisterRequest>()

        val existingUser = MongoClientProvider.users.findOne(User::email eq request.email)
        if (existingUser != null) {
            call.respond(HttpStatusCode.Conflict, mapOf("error" to "User already exists"))
            return@post
        }

        val hashedPassword = BCrypt.hashpw(request.password, BCrypt.gensalt())
        val apiKey = UUID.randomUUID().toString().replace("-", "")
        val user = User(
            email = request.email,
            hashedPassword = hashedPassword,
            apiKey = apiKey
        )

        MongoClientProvider.users.insertOne(user)
        val token = JwtService.generateToken(apiKey)
        call.respond(AuthResponse(token = token, apiKey = apiKey))
    }

    post("/login") {
        val request = call.receive<LoginRequest>()
        val user = MongoClientProvider.users.findOne(User::email eq request.email)

        if (user == null || !BCrypt.checkpw(request.password, user.hashedPassword)) {
            call.respond(Unauthorized, mapOf("error" to "Invalid credentials"))
            return@post
        }

        val token = JwtService.generateToken(user.apiKey)
        call.respond(AuthResponse(token = token, apiKey = "Был сообщён при регистрации!"))
    }

}