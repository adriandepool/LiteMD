# 🦀 Apuntes de Rust para Desarrolladores

Un resumen rápido de los conceptos clave en el lenguaje de programación Rust.

## 1. Variables y Mutabilidad

En Rust, las variables son **inmutables** por defecto. Para hacerlas mutables se usa la palabra clave `mut`.

```rust
fn main() {
    let x = 5; // Inmutable
    let mut y = 10; // Mutable
    y += x;
    println!("El valor de y es: {}", y);
}
```

## 2. Tipos de Datos Comunes

| Tipo | Sintaxis | Ejemplo |
| :--- | :--- | :--- |
| Entero | `i32`, `u64` | `42` |
| Flotante | `f64` | `3.1416` |
| Booleano | `bool` | `true` |
| Carácter | `char` | `'z'` |

## 3. Manejo de Errores con `Result`

Rust no tiene excepciones. En su lugar, utiliza el tipo enum `Result<T, E>`.

```rust
fn dividir(numerador: f64, denominador: f64) -> Result<f64, String> {
    if denominador == 0.0 {
        Err(String::from("No se puede dividir por cero"))
    } else {
        Ok(numerador / denominador)
    }
}
```

---
*Apuntes creados con amor por Adrian Reyes.*
