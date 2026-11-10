import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
    id("org.jetbrains.kotlin.plugin.compose")
}
val authSettings = Properties().apply {
    rootProject.file("auth.local.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}
fun authValue(key: String) = providers.gradleProperty(key).orNull ?: authSettings.getProperty(key, "")
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "").replace("\r", "") + "\""
val useAuthEmulator = authValue("gajaham.auth.emulator") == "true"
android {
    namespace = "kr.gajaham.app"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    defaultConfig {
        applicationId = "kr.gajaham.app"
        minSdk = 29
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-dev"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "AUTH_API_KEY", quoted(authValue("gajaham.auth.apiKey")))
        buildConfigField("String", "AUTH_APP_ID", quoted(authValue("gajaham.auth.appId")))
        buildConfigField("String", "AUTH_PROJECT_ID", quoted(authValue("gajaham.auth.projectId")))
        buildConfigField("boolean", "AUTH_EMULATOR", "false")
        buildConfigField("String", "AUTH_EMULATOR_HOST", quoted("10.0.2.2"))
        javaCompileOptions {
            annotationProcessorOptions { arguments["room.schemaLocation"] = "$projectDir/schemas" }
        }
    }
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            buildConfigField("boolean", "AUTH_EMULATOR", useAuthEmulator.toString())
            buildConfigField("String", "AUTH_EMULATOR_HOST", quoted(authValue("gajaham.auth.emulatorHost").ifBlank { "10.0.2.2" }))
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true; buildConfig = true }
    testOptions { unitTests.isIncludeAndroidResources = true }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(platform("com.google.firebase:firebase-bom:34.9.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation(project(":core"))
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    val composeBom = platform("androidx.compose:compose-bom:2025.10.01")
    implementation(composeBom)
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.room:room-runtime:2.8.5")
    annotationProcessor("androidx.room:room-compiler:2.8.5")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.16.1")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation(platform("androidx.compose:compose-bom:2025.10.01"))
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
tasks.withType<Test>().configureEach {
    if (providers.gradleProperty("gajaham.auth.integration").orNull != "true") exclude("**/AuthEmulatorTest*")
}
