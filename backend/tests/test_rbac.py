def test_role_based_access_control(client, student_user, outsider_user, auth_headers):
    student_headers = auth_headers(student_user)
    outsider_headers = auth_headers(outsider_user)

    # 1. Student attempting driver endpoint -> 403
    res_s_driver = client.post("/api/driver/tracking/start", headers=student_headers)
    assert res_s_driver.status_code == 403

    # 2. Student attempting admin endpoint -> 403
    res_s_admin = client.get("/api/admin/drivers", headers=student_headers)
    assert res_s_admin.status_code == 403

    # 3. Outsider attempting driver endpoint -> 403
    res_o_driver = client.post("/api/driver/tracking/start", headers=outsider_headers)
    assert res_o_driver.status_code == 403

    # 4. Outsider attempting admin endpoint -> 403
    res_o_admin = client.get("/api/admin/drivers", headers=outsider_headers)
    assert res_o_admin.status_code == 403

    # 5. Unauthenticated request to driver endpoint -> 401
    res_no_auth = client.post("/api/driver/tracking/start")
    assert res_no_auth.status_code == 401
