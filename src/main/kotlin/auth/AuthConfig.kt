package ru.itis.tda.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm

object AuthConfig {
    private const val secret = "your_secret_key"
    private const val issuer = "tda.analytics"
    private const val audience = "tda.sdk"
    const val realm = "tda"

    val algorithm = Algorithm.HMAC256(secret)

    val verifier = JWT.require(algorithm)
        .withIssuer(issuer)
        .withAudience(audience)
        .build()

    fun generateToken(apiKey: String): String = JWT.create()
        .withAudience(audience)
        .withIssuer(issuer)
        .withClaim("apiKey", apiKey)
        .sign(algorithm)
}