package com.simplyft.backend.security;

public record AuthUser(Long id, String name, String email, String role, String title) {}
