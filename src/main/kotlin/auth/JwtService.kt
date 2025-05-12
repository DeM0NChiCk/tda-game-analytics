package ru.itis.tda.auth

import com.auth0.jwt.JWT

object JwtService {
    fun generateToken(apiKey: String): String = AuthConfig.generateToken(apiKey)
}