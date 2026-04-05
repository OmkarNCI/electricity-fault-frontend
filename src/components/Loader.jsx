function Loader({ text = "Loading..." }) {
  return (
    <div className="loader-box">
      <div className="loader"></div>
      <p>{text}</p>
    </div>
  );
}

export default Loader;